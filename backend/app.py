# backend/app.py

import os
import json
import traceback
import uuid
from dotenv import load_dotenv
from flask import Flask, jsonify, request, g
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    jwt_required,
    get_jwt_identity,
    unset_jwt_cookies,
)
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import timedelta
import logging
from functools import wraps
import click
from flask_cors import CORS
from ai_model import process_structured_financial_data
from werkzeug.utils import secure_filename
import models
from models import (
    db,
    User,
    Company,
    BalanceSheet,
    ROLE_ADMIN,
    ROLE_CEO,
    ROLE_ANALYST,
)
from ai_model import (
    initialize_ai_components,
    generate_chat_response,
    delete_vectors_for_balance_sheet,
)

load_dotenv()

# Logger setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global AI components (initialized in create_app)
llm = None
embeddings = None

# --- Helper Functions (keep these as they are) ---


def hash_pwd(password):
    return generate_password_hash(password)


def get_authorized_company_ids(user):
    """
    Determines which company IDs a user is authorized to view.
    """
    if user.role == ROLE_ADMIN:
        # Admins can see all companies
        return [c.id for c in Company.query.all()]
    elif user.role == ROLE_CEO:
        # CEOs can see their assigned company and any direct child companies
        ceo_company = Company.query.get(user.company_id)
        if ceo_company:
            authorized_ids = [ceo_company.id]
            child_companies = Company.query.filter_by(
                parent_company_id=ceo_company.id
            ).all()
            authorized_ids.extend([c.id for c in child_companies])
            return list(set(authorized_ids))  # Use set to remove duplicates
        return []
    elif user.role == ROLE_ANALYST:
        # Analysts can only see their assigned company
        return [user.company_id] if user.company_id else []
    return []


def require_role(roles):
    """Decorator to restrict access based on user roles."""

    def wrapper(fn):
        @wraps(fn)
        @jwt_required()
        def decorator(*args, **kwargs):
            # get_jwt_identity() will now return a string (the user ID)
            g.current_user = User.query.get(
                int(get_jwt_identity())
            )  # Cast back to int for DB query
            if g.current_user is None or g.current_user.role not in roles:
                logger.warning(
                    f"Unauthorized access attempt by user {g.current_user.username if g.current_user else 'None'} with role {g.current_user.role if g.current_user else 'None'}. Required roles: {roles}"
                )
                return (
                    jsonify({"msg": "Forbidden: Insufficient permissions"}),
                    403,
                )
            return fn(*args, **kwargs)

        return decorator

    return wrapper


# --- Application Factory Function ---


def create_app():
    app = Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///oculis.sqlite"
    app.config["JWT_SECRET_KEY"] = os.environ.get(
        "JWT_SECRET_KEY", "super-secret-jwt-key"
    )
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=24)
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["UPLOAD_FOLDER"] = "uploads"  # Directory to save uploaded files
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

    # Initialize CORS for your frontend origin
    CORS(
        app,
        resources={r"/api/*": {"origins": "http://localhost:5173"}},
        supports_credentials=True,  # Allow cookies/authentication headers to be sent
        methods=[
            "GET",
            "POST",
            "PUT",
            "DELETE",
            "OPTIONS",
        ],  # Explicitly allow methods
        allow_headers=[
            "Content-Type",
            "Authorization",
        ],  # Explicitly allow headers
    )

    db.init_app(app)  # Initialize SQLAlchemy with the app
    jwt = JWTManager(app)  # Initialize JWTManager with the app

    # Initialize AI components
    global llm, embeddings, vectorstore
    llm, embeddings, vectorstore = initialize_ai_components()

    @app.before_request
    def inject_ai_components():
        g.llm = llm
        g.embeddings = embeddings

    # --- CLI Command for Database Seeding ---
    @app.cli.command("seed-db")
    @click.option(
        "--force", is_flag=True, help="Force re-seeding even if users exist."
    )
    def seed_db_command(force):
        """Initializes the database and seeds initial users and companies."""
        with app.app_context():
            db.create_all()  # Ensure tables are created

            if force or not User.query.first():
                logger.info("Seeding initial users and companies...")

                # Clear existing data if force is true or no users exist
                if force:
                    db.session.query(BalanceSheet).delete()
                    db.session.query(User).delete()
                    db.session.query(Company).delete()
                    db.session.commit()
                    logger.info("Cleared existing database data.")

                # Admin User
                admin = User(
                    username="ambani_family",
                    password_hash=hash_pwd("adminpass"),
                    role=ROLE_ADMIN,
                    email="admin@example.com",
                )
                db.session.add(admin)

                # Companies
                reliance_industries = Company(
                    name="Reliance Industries Ltd.", currency="INR"
                )
                jio_platforms = Company(
                    name="Jio Platforms Ltd.", currency="INR"
                )
                reliance_retail = Company(
                    name="Reliance Retail Ltd.", currency="INR"
                )
                tata_motors = Company(name="Tata Motors Ltd.", currency="INR")
                infosys = Company(name="Infosys Ltd.", currency="INR")
                wipro = Company(name="Wipro Ltd.", currency="INR")
                dmart = Company(
                    name="Avenue Supermarts Ltd. (DMart)", currency="INR"
                )
                hdfc_bank = Company(name="HDFC Bank Ltd.", currency="INR")

                db.session.add_all(
                    [
                        reliance_industries,
                        jio_platforms,
                        reliance_retail,
                        tata_motors,
                        infosys,
                        wipro,
                        dmart,
                        hdfc_bank,
                    ]
                )
                db.session.commit()  # Commit companies to get their IDs

                # Set up parent-child relationships after commit
                jio_platforms.parent_company_id = reliance_industries.id
                reliance_retail.parent_company_id = reliance_industries.id
                db.session.commit()

                # CEO Users
                jio_ceo = User(
                    username="jio_ceo",
                    password_hash=hash_pwd("jioceo123"),
                    role=ROLE_CEO,
                    company_id=jio_platforms.id,
                    email="jio.ceo@example.com",
                )
                reliance_retail_ceo = User(
                    username="reliance_retail_ceo",
                    password_hash=hash_pwd("retailceo123"),
                    role=ROLE_CEO,
                    company_id=reliance_retail.id,
                    email="retail.ceo@example.com",
                )
                tata_motors_ceo = User(
                    username="tata_motors_ceo",
                    password_hash=hash_pwd("tataceo123"),
                    role=ROLE_CEO,
                    company_id=tata_motors.id,
                    email="tata.ceo@example.com",
                )
                db.session.add_all(
                    [jio_ceo, reliance_retail_ceo, tata_motors_ceo]
                )

                # Analyst Users
                reliance_analyst = User(
                    username="reliance_analyst",
                    password_hash=hash_pwd("relanalyst123"),
                    role=ROLE_ANALYST,
                    company_id=reliance_industries.id,
                    email="reliance.analyst@example.com",
                )
                jio_analyst = User(
                    username="jio_analyst",
                    password_hash=hash_pwd("jioanalyst123"),
                    role=ROLE_ANALYST,
                    company_id=jio_platforms.id,
                    email="jio.analyst@example.com",
                )
                infosys_analyst = User(
                    username="infosys_analyst",
                    password_hash=hash_pwd("infy_anl"),
                    role=ROLE_ANALYST,
                    company_id=infosys.id,
                    email="infosys.analyst@example.com",
                )
                dmart_analyst = User(
                    username="dmart_analyst",
                    password_hash=hash_pwd("dmart_anl"),
                    role=ROLE_ANALYST,
                    company_id=dmart.id,
                    email="dmart.analyst@example.com",
                )
                db.session.add_all(
                    [
                        reliance_analyst,
                        jio_analyst,
                        infosys_analyst,
                        dmart_analyst,
                    ]
                )

                db.session.commit()
                logger.info("Users and companies seeded successfully.")
            else:
                logger.info(
                    "Database already contains users. Skipping seeding. Use 'flask seed-db --force' to re-seed."
                )

    # --- Register Blueprints/Routes here (for a larger app) ---
    # For this MVP, we'll keep routes directly in app.py for simplicity,
    # but in a production app, you'd register blueprints here.

    # --- Authentication and User Management Routes ---
    @app.route("/api/register", methods=["POST"])
    @require_role([ROLE_ADMIN])
    def register():
        data = request.get_json()
        username = data.get("username")
        password = data.get("password")
        role = data.get("role")
        company_id = data.get("company_id")
        email = data.get("email")

        if not username or not password or not role:
            return jsonify({"msg": "Missing username, password, or role"}), 400

        if User.query.filter_by(username=username).first():
            return jsonify({"msg": "User already exists"}), 409

        if role not in [ROLE_ADMIN, ROLE_CEO, ROLE_ANALYST]:
            return jsonify({"msg": "Invalid role specified"}), 400

        if role != ROLE_ADMIN and not company_id:
            return (
                jsonify(
                    {"msg": "Company ID is required for CEO and Analyst roles"}
                ),
                400,
            )

        if company_id:
            company = Company.query.get(company_id)
            if not company:
                return jsonify({"msg": "Company not found"}), 404

        new_user = User(
            username=username,
            password_hash=hash_pwd(password),
            role=role,
            company_id=company_id if role != ROLE_ADMIN else None,
            email=email,
        )
        db.session.add(new_user)
        db.session.commit()

        return (
            jsonify(
                {"msg": "User registered successfully", "user_id": new_user.id}
            ),
            201,
        )

    @app.route("/api/login", methods=["POST"])
    def login():
        username = request.json.get("username", None)
        password = request.json.get("password", None)

        user = User.query.filter_by(username=username).first()

        if user and check_password_hash(user.password_hash, password):
            access_token = create_access_token(identity=str(user.id))
            logger.info(f"User {username} logged in successfully.")
            return (
                jsonify(
                    access_token=access_token,
                    username=user.username,
                    role=user.role,
                ),
                200,
            )
        else:
            logger.warning(f"Failed login attempt for username: {username}")
            return jsonify({"msg": "Bad username or password"}), 401

    @app.route("/api/logout", methods=["POST"])
    @jwt_required()
    def logout():
        unset_jwt_cookies(jsonify({"msg": "Successfully logged out"}))
        return jsonify({"msg": "Successfully logged out"}), 200

    @app.route("/api/current_user", methods=["GET"])
    @jwt_required()
    def get_current_user_info():
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if user:
            return (
                jsonify(
                    {
                        "id": user.id,
                        "username": user.username,
                        "role": user.role,
                        "company_id": user.company_id,
                        "email": user.email,
                    }
                ),
                200,
            )
        return jsonify({"msg": "User not found"}), 404

    @app.route("/api/users", methods=["GET"])
    @require_role([ROLE_ADMIN])
    def get_all_users():
        users = User.query.all()
        users_data = [
            {
                "id": u.id,
                "username": u.username,
                "role": u.role,
                "company_id": u.company_id,
                "email": u.email,
            }
            for u in users
        ]
        return jsonify(users_data), 200

    @app.route("/api/users/<int:user_id>", methods=["GET"])
    @require_role([ROLE_ADMIN])
    def get_user_by_id(user_id):
        user = User.query.get(user_id)
        if user:
            return (
                jsonify(
                    {
                        "id": user.id,
                        "username": user.username,
                        "role": user.role,
                        "company_id": user.company_id,
                        "email": user.email,
                    }
                ),
                200,
            )
        return jsonify({"msg": "User not found"}), 404

    @app.route("/api/users/<int:user_id>", methods=["PUT"])
    @require_role([ROLE_ADMIN])
    def update_user(user_id):
        user = User.query.get(user_id)
        if not user:
            return jsonify({"msg": "User not found"}), 404

        data = request.get_json()
        user.username = data.get("username", user.username)
        user.role = data.get("role", user.role)
        user.email = data.get("email", user.email)

        new_company_id = data.get("company_id")
        if user.role != ROLE_ADMIN:
            if new_company_id:
                company = Company.query.get(new_company_id)
                if not company:
                    return jsonify({"msg": "Company not found"}), 404
                user.company_id = new_company_id
            else:
                user.company_id = None
        else:
            user.company_id = None

        db.session.commit()
        return jsonify({"msg": "User updated successfully"}), 200

    @app.route("/api/users/<int:user_id>", methods=["DELETE"])
    @require_role([ROLE_ADMIN])
    def delete_user(user_id):
        user = User.query.get(user_id)
        if not user:
            return jsonify({"msg": "User not found"}), 404
        db.session.delete(user)
        db.session.commit()
        return jsonify({"msg": "User deleted successfully"}), 200

    # --- Company Management Routes ---

    @app.route("/api/companies", methods=["POST"])
    @require_role([ROLE_ADMIN])
    def add_company():
        data = request.get_json()
        name = data.get("name")
        currency = data.get("currency", "USD")
        parent_company_id = data.get("parent_company_id")

        if not name:
            return jsonify({"msg": "Company name is required"}), 400

        if Company.query.filter_by(name=name).first():
            return (
                jsonify({"msg": "Company with this name already exists"}),
                409,
            )

        if parent_company_id:
            parent_company = Company.query.get(parent_company_id)
            if not parent_company:
                return jsonify({"msg": "Parent company not found"}), 404

        new_company = Company(
            name=name, currency=currency, parent_company_id=parent_company_id
        )
        db.session.add(new_company)
        db.session.commit()
        return (
            jsonify(
                {
                    "msg": "Company added successfully",
                    "company_id": new_company.id,
                }
            ),
            201,
        )

    @app.route("/api/companies", methods=["GET"])
    @jwt_required()
    def get_companies():
        user_id = int(get_jwt_identity())
        current_user = User.query.get(user_id)

        if not current_user:
            return jsonify({"msg": "User not found"}), 404

        authorized_company_ids = get_authorized_company_ids(current_user)

        if not authorized_company_ids:
            return jsonify([]), 200

        companies = Company.query.filter(
            Company.id.in_(authorized_company_ids)
        ).all()
        companies_data = [
            {
                "id": c.id,
                "name": c.name,
                "currency": c.currency,
                "parent_company_id": c.parent_company_id,
            }
            for c in companies
        ]
        return jsonify(companies_data), 200

    @app.route("/api/companies/<int:company_id>", methods=["GET"])
    @jwt_required()
    def get_company_by_id(company_id):
        user_id = int(get_jwt_identity())
        current_user = User.query.get(user_id)

        if not current_user:
            return jsonify({"msg": "User not found"}), 404

        authorized_company_ids = get_authorized_company_ids(current_user)
        if company_id not in authorized_company_ids:
            logger.warning(
                f"User {current_user.username} (ID: {user_id}) attempted to access unauthorized company ID: {company_id}"
            )
            return (
                jsonify(
                    {"msg": "Forbidden: Not authorized to view this company"}
                ),
                403,
            )

        company = Company.query.get(company_id)
        if company:
            return (
                jsonify(
                    {
                        "id": company.id,
                        "name": company.name,
                        "currency": company.currency,
                        "parent_company_id": company.parent_company_id,
                    }
                ),
                200,
            )
        return jsonify({"msg": "Company not found"}), 404

    @app.route("/api/companies/<int:company_id>", methods=["PUT"])
    @require_role([ROLE_ADMIN])
    def update_company(company_id):
        company = Company.query.get(company_id)
        if not company:
            return jsonify({"msg": "Company not found"}), 404

        data = request.get_json()
        company.name = data.get("name", company.name)
        company.currency = data.get("currency", company.currency)
        company.parent_company_id = data.get(
            "parent_company_id", company.parent_company_id
        )

        if company.parent_company_id is not None:
            parent_company = Company.query.get(company.parent_company_id)
            if not parent_company:
                return jsonify({"msg": "Parent company not found"}), 404
            if company.id == company.parent_company_id:
                return (
                    jsonify({"msg": "Company cannot be its own parent"}),
                    400,
                )

        db.session.commit()
        return jsonify({"msg": "Company updated successfully"}), 200

    @app.route("/api/companies/<int:company_id>", methods=["DELETE"])
    @require_role([ROLE_ADMIN])
    def delete_company(company_id):
        company = Company.query.get(company_id)
        if not company:
            return jsonify({"msg": "Company not found"}), 404

        User.query.filter_by(company_id=company_id).update(
            {"company_id": None}
        )
        BalanceSheet.query.filter_by(company_id=company_id).delete()

        db.session.delete(company)
        db.session.commit()
        return jsonify({"msg": "Company deleted successfully"}), 200

    # --- Balance Sheet Routes ---
    @app.route("/api/balance_sheets", methods=["POST"])
    def upload_balance_sheet():
        if "file" not in request.files:
            return jsonify({"error": "No file part"}), 400
        if "company_id" not in request.form:
            return jsonify({"error": "Company ID is required"}), 400
        if "year" not in request.form:
            return jsonify({"error": "Year is required"}), 400

        file = request.files["file"]
        company_id = request.form["company_id"]
        year = int(request.form["year"])

        if file.filename == "":
            return jsonify({"error": "No selected file"}), 400

        company = Company.query.get(company_id)
        if not company:
            return jsonify({"error": "Company not found"}), 404

        filename = f"{uuid.uuid4().hex}_{secure_filename(file.filename)}"
        filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)

        try:
            file_extension = os.path.splitext(filename)[1].lower()
            if file_extension not in [".csv", ".xlsx"]:
                return (
                    jsonify(
                        {
                            "error": "Unsupported file type. Only CSV and Excel files are allowed."
                        }
                    ),
                    400,
                )

            file.save(filepath)
            logger.info(f"File saved to {filepath}")

            # Delete existing balance sheet data and vectors for this company and year
            # This ensures we don't have duplicate or old data for the same year/company
            existing_bs = BalanceSheet.query.filter_by(
                company_id=company_id, year=year
            ).first()
            if existing_bs:
                db.session.delete(existing_bs)
                db.session.commit()
                logger.info(
                    f"Deleted existing balance sheet entry for Company ID: {company_id}, Year: {year}"
                )
                # Also delete associated vectors from ChromaDB
                delete_vectors_for_balance_sheet(
                    company_id, year
                )  # Ensure this function is updated too

            # Process the structured financial data from the uploaded file
            processed_data = process_structured_financial_data(
                filepath,
                company_id,
                year,
                embeddings,  # Pass embeddings for vector store update
                db.session,  # Pass db session for saving to BalanceSheet model
            )

            if not processed_data:
                return (
                    jsonify(
                        {
                            "error": "Failed to process financial data from the file. Check file format."
                        }
                    ),
                    422,
                )

            logger.info(
                f"Processed data for {company_id}, {year}: {processed_data}"
            )

            # The process_structured_financial_data function now handles saving to DB and ChromaDB
            # We just need to return a success message here.
            return (
                jsonify(
                    {
                        "message": "Balance sheet uploaded and processed successfully",
                        "company_id": company_id,
                        "year": year,
                        "filename": filename,
                        "extracted_metrics": {
                            "revenue": processed_data.get("revenue"),
                            "net_income": processed_data.get("net_income"),
                            "assets": processed_data.get("assets"),
                            "liabilities": processed_data.get("liabilities"),
                        },
                    }
                ),
                201,
            )

        except Exception as e:
            db.session.rollback()
            logger.error(
                f"Error uploading/processing file for company {company_id}, year {year}: {e}"
            )
            logger.error(traceback.format_exc())  # Log full traceback
            return jsonify({"error": f"Internal server error: {str(e)}"}), 500
        finally:
            # Clean up the uploaded file after processing
            if os.path.exists(filepath):
                os.remove(filepath)
                logger.info(f"Cleaned up temporary file: {filepath}")

    @app.route(
        "/api/balance_sheets/<int:company_id>/<int:year>", methods=["DELETE"]
    )
    @jwt_required()
    def delete_balance_sheet(company_id, year):
        user_id = int(get_jwt_identity())
        current_user = User.query.get(user_id)

        if not current_user:
            return jsonify({"msg": "User not found"}), 404

        if current_user.role not in [ROLE_ADMIN, ROLE_CEO]:
            return (
                jsonify(
                    {
                        "msg": "Forbidden: Only Admins and CEOs can delete balance sheets"
                    }
                ),
                403,
            )

        if current_user.role == ROLE_CEO:
            authorized_company_ids = get_authorized_company_ids(current_user)
            if company_id not in authorized_company_ids:
                logger.warning(
                    f"CEO user {current_user.username} (ID: {user_id}) attempted to delete balance sheet for unauthorized company ID: {company_id}"
                )
                return (
                    jsonify(
                        {
                            "msg": "Forbidden: Not authorized to delete balance sheets for this company"
                        }
                    ),
                    403,
                )

        balance_sheet = BalanceSheet.query.filter_by(
            company_id=company_id, year=year
        ).first()
        if not balance_sheet:
            return jsonify({"msg": "Balance sheet not found"}), 404

        try:
            delete_vectors_for_balance_sheet(company_id, year)
            logger.info(
                f"Deleted vector embeddings for Company ID: {company_id}, Year: {year}"
            )

            db.session.delete(balance_sheet)
            db.session.commit()
            return jsonify({"msg": "Balance sheet deleted successfully"}), 200
        except Exception as e:
            logger.error(f"Error deleting balance sheet: {e}")
            return (
                jsonify({"msg": f"Error deleting balance sheet: {str(e)}"}),
                500,
            )

    @app.route("/api/company_metrics/<int:company_id>", methods=["GET"])
    @jwt_required()
    def get_company_metrics(company_id):
        user_id = int(get_jwt_identity())
        current_user = User.query.get(user_id)

        if not current_user:
            return jsonify({"msg": "User not found"}), 404

        authorized_company_ids = get_authorized_company_ids(current_user)
        if company_id not in authorized_company_ids:
            logger.warning(
                f"User {current_user.username} (ID: {user_id}) attempted to access metrics for unauthorized company ID: {company_id}"
            )
            return (
                jsonify(
                    {
                        "msg": "Forbidden: Not authorized to view metrics for this company"
                    }
                ),
                403,
            )

        company = Company.query.get(company_id)
        if not company:
            return jsonify({"msg": "Company not found"}), 404

        balance_sheets = (
            BalanceSheet.query.filter_by(company_id=company_id)
            .order_by(BalanceSheet.year)
            .all()
        )

        if not balance_sheets:
            return (
                jsonify(
                    {"msg": "No financial metrics found for this company"}
                ),
                404,
            )

        years = []
        revenue = []
        net_income = []
        assets = []
        liabilities = []

        for bs in balance_sheets:
            years.append(bs.year)
            revenue.append(bs.revenue)
            net_income.append(bs.net_income)
            assets.append(bs.assets)
            liabilities.append(bs.liabilities)

        return (
            jsonify(
                {
                    "company_name": company.name,
                    "currency": company.currency,
                    "years": years,
                    "revenue": revenue,
                    "netIncome": net_income,
                    "assets": assets,
                    "liabilities": liabilities,
                }
            ),
            200,
        )

    # --- Chat Interface Route ---
    @app.route("/api/chat", methods=["POST"])
    @jwt_required()
    def chat_with_ai():
        user_id = int(get_jwt_identity())
        current_user = User.query.get(user_id)

        if not current_user:
            return jsonify({"msg": "User not found"}), 404

        data = request.json
        user_query = data.get("query")
        company_id = data.get("company_id")

        if not user_query or company_id is None:
            return jsonify({"error": "Query and company_id are required"}), 400

        if g.llm is None or g.embeddings is None:
            return (
                jsonify(
                    {
                        "error": "AI components not initialized. Please try again later."
                    }
                ),
                500,
            )

        try:
            response_text = generate_chat_response(
                user_query,
                company_id,
                g.llm,
                g.embeddings,
                db.session,
                None,  # models parameter is no longer directly used in ai_model, can remove later if not needed
            )
            return jsonify({"response": response_text})
        except Exception as e:
            logger.error(f"Error in chat endpoint: {e}")
            logger.error(traceback.format_exc())
            return (
                jsonify(
                    {
                        "error": "An error occurred while processing your request."
                    }
                ),
                500,
            )

    # --- Health endpoint ---
    @app.get("/api/health")
    def health():
        ai_status = "available" if (llm and embeddings) else "unavailable"
        chroma_status = (
            "available" if os.path.exists("./chroma_db") else "not_initialized"
        )
        # Check if DB has at least one user to confirm connection/tables
        db_connected = False
        try:
            with app.app_context():  # Ensure we are in app context for DB query
                db_connected = db.session.query(User).first() is not None
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            db_connected = False

        return jsonify(
            {
                "status": "healthy",
                "ai_components": ai_status,
                "chromadb": chroma_status,
                "database": "connected" if db_connected else "not_connected",
            }
        )

    return app


# This part is for running the development server directly.
# For CLI commands, Flask typically looks for a 'create_app' function
# or an 'app' instance at the top level of the FLASK_APP module.
# By defining 'app' here, it helps Flask discover the app for 'flask run'.
# For CLI commands, 'create_app' is the preferred way.
if __name__ == "__main__":
    app = create_app()  # Create the app instance using the factory
    with app.app_context():
        db.create_all()
    app.run(debug=True)
