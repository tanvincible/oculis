"""
Flask application entrypoint with AI/RAG capabilities
Run:  `python app.py`
"""

from flask_cors import CORS
import os
import json
import logging
import asyncio
from dotenv import load_dotenv
from flask import Flask, request, jsonify, session, g
from models import db, User, Company, BalanceSheetEntry
from auth import login_required, SESSION_USER_ID, hash_pwd, verify_pwd
import models  # to register constants
from ingest import bp as ingest_bp

# LangChain and AI imports
from langchain_google_genai import (
    ChatGoogleGenerativeAI,
    GoogleGenerativeAIEmbeddings,
)
from langchain_chroma import Chroma
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from langchain.memory import ConversationBufferMemory
from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
import chromadb

# -------------------------------------------------------------------- #
#  Config & initialization                                             #
# -------------------------------------------------------------------- #
load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '.env'))

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///balance_sheet.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SECRET_KEY"] = os.getenv("FLASK_SECRET_KEY", "dev-secret")

db.init_app(app)
app.register_blueprint(ingest_bp)

# After Flask app initialization:
CORS(
    app,
    supports_credentials=True,
    origins=["http://localhost:5173", "http://localhost:3000"],
)

# Global AI components
llm = None
embeddings = None
memory_store = {}  # Session-based memory storage
db_initialized = False  # Flag to ensure DB init runs once


def get_authorized_company_ids(user):
    # group_admin: all companies
    if user.role == "admin":
        return [c.id for c in Company.query.all()]
    # ceo: assigned company + direct children
    if user.role == "ceo":
        ids = [user.company_id] if user.company_id else []
        children = Company.query.filter_by(
            parent_company_id=user.company_id
        ).all()
        ids += [c.id for c in children]
        return ids
    # analyst: only assigned company
    if user.role == "analyst":
        return [user.company_id] if user.company_id else []
    return []


def require_group_admin(user):
    if user.role != "admin":
        return False
    return True


def initialize_ai_components():
    """Initialize AI components."""
    global llm, embeddings
    
    if llm is not None and embeddings is not None:
        return llm, embeddings

    gemini_api_key = os.getenv("GEMINI_API_KEY")
    if not gemini_api_key:
        logging.warning("GEMINI_API_KEY not found. AI features will be disabled.")
        return False

    try:
        # Ensure an event loop is running for grpc.aio
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            logging.info("Created new asyncio event loop for AI component initialization.")

        # Initialize LLM and Embeddings
        llm = ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",
            google_api_key=gemini_api_key,
            temperature=0.1,
            max_output_tokens=1024,
        )
        embeddings = GoogleGenerativeAIEmbeddings(
            model="models/embedding-001", google_api_key=gemini_api_key
        )
        logging.info("AI components initialized successfully.")
        return llm, embeddings
    except Exception as e:
        logging.error(f"Error initializing AI components: {e}", exc_info=True)
        llm = None
        embeddings = None
        return None, None



@app.before_request
def setup_app():
    """Runs before every request; initializes AI and DB once."""
    global llm, embeddings, db_initialized

    if llm is None or embeddings is None:
        initialize_ai_components()

    if not db_initialized:
        with app.app_context():
            db.create_all()
            if not User.query.first():
                admin = User(
                    username="admin",
                    password_hash=hash_pwd("admin123"),
                    role=models.ROLE_ADMIN,
                )
                db.session.add(admin)

                sample_path = os.path.join(
                    os.path.dirname(__file__), "seed_data", "sample_users.json"
                )
                if os.path.exists(sample_path):
                    data = json.load(open(sample_path))
                    for u in data:
                        db.session.add(
                            User(
                                username=u["username"],
                                password_hash=hash_pwd(u["password"]),
                                role=u["role"],
                            )
                        )
                db.session.commit()
        db_initialized = True


# -------------------------------------------------------------------- #
#  Auth endpoints                                                      #
# -------------------------------------------------------------------- #
@app.post("/api/register")
def register():
    payload = request.json or {}
    if not {"username", "password", "role"} <= payload.keys():
        return {"error": "required: username, password, role"}, 400
    if payload["role"] not in models.ALL_ROLES:
        return {"error": f"role must be one of {models.ALL_ROLES}"}, 400
    if User.query.filter_by(username=payload["username"]).first():
        return {"error": "username taken"}, 409
    user = User(
        username=payload["username"],
        password_hash=hash_pwd(payload["password"]),
        role=payload["role"],
    )
    db.session.add(user)
    db.session.commit()
    return {"id": user.id}, 201


@app.post("/api/login")
def login():
    payload = request.json or {}
    user = User.query.filter_by(username=payload.get("username")).first()
    if not user or not verify_pwd(
        user.password_hash, payload.get("password", "")
    ):
        return {"error": "invalid credentials"}, 401
    session[SESSION_USER_ID] = user.id
    return {"message": "logged in"}


@app.post("/api/logout")
@login_required()
def logout():
    session.pop(SESSION_USER_ID, None)
    user_id = g.current_user.id
    if user_id in memory_store:
        del memory_store[user_id]
    return {"message": "logged out"}


# -------------------------------------------------------------------- #
#  Company access endpoint                                             #
# -------------------------------------------------------------------- #
@app.get("/api/companies")
@login_required()
def get_companies():
    user = g.current_user
    companies = Company.query.all()
    return jsonify(
        [
            {
                "id": company.id,
                "name": company.name,
                "created_at": (
                    company.created_at.isoformat()
                    if company.created_at
                    else None
                ),
            }
            for company in companies
        ]
    )


# -------------------------------------------------------------------- #
#  RAG Chat endpoint                                                   #
# -------------------------------------------------------------------- #
@app.post("/api/chat")
@login_required()
def chat():
    global llm, embeddings, memory_store

    if not llm or not embeddings:
        return {
            "error": "AI services unavailable. Please check GEMINI_API_KEY."
        }, 503

    payload = request.json or {}
    query = payload.get("query", "").strip()
    company_id = payload.get("company_id")

    if not query:
        return {"error": "query is required"}, 400
    if not company_id:
        return {"error": "company_id is required"}, 400

    user = g.current_user
    company = Company.query.get(company_id)
    if not company:
        return {"error": "Company not found"}, 404

    try:
        chroma_db_dir = "./chroma_db"
        if not os.path.exists(chroma_db_dir):
            return {
                "error": "ChromaDB not initialized. Please run data_ingestion_script.py first."
            }, 503

        persistent_client = chromadb.PersistentClient(path=chroma_db_dir)
        vectorstore = Chroma(
            client=persistent_client,
            collection_name="balance_sheet_data",
            embedding_function=embeddings,
        )

        retriever = vectorstore.as_retriever(
            search_kwargs={"k": 5, "filter": {"company_id": company_id}}
        )

        user_id = user.id
        if user_id not in memory_store:
            memory_store[user_id] = ConversationBufferMemory(
                memory_key="chat_history",
                return_messages=True,
                output_key="answer",
            )
        memory = memory_store[user_id]

        system_prompt = (
            "You are a financial analyst AI assistant specializing in balance sheet analysis. "
            f"You have access to balance sheet data for {company.name}. "
            "Use the provided context to answer questions about financial metrics, trends, and insights. "
            "Be precise, analytical, and provide specific numbers from the data when available. "
            "If you cannot find relevant information in the context, clearly state that. "
            "Keep your responses concise but informative.\n\n"
            "Context:\n{context}"
        )

        prompt = ChatPromptTemplate.from_messages(
            [
                ("system", system_prompt),
                MessagesPlaceholder("chat_history"),
                ("human", "{input}"),
            ]
        )

        document_chain = create_stuff_documents_chain(llm, prompt)
        retrieval_chain = create_retrieval_chain(retriever, document_chain)
        chat_history = memory.chat_memory.messages

        response = retrieval_chain.invoke(
            {"input": query, "chat_history": chat_history}
        )

        memory.save_context({"input": query}, {"answer": response["answer"]})

        result = {
            "answer": response["answer"],
            "company": company.name,
            "sources_count": len(response.get("context", [])),
            "conversation_length": len(memory.chat_memory.messages),
        }

        if payload.get("include_sources", False):
            result["sources"] = [
                {"content": doc.page_content, "metadata": doc.metadata}
                for doc in response.get("context", [])
            ]

        return jsonify(result)

    except Exception as e:
        print(f"Error in chat endpoint: {e}")
        return {"error": f"Internal server error: {str(e)}"}, 500


@app.get("/api/company_metrics/<int:company_id>")
@login_required()
def company_metrics(company_id):
    user = g.current_user
    company = Company.query.get(company_id)
    if not company:
        return {"error": "Company not found"}, 404
    # RBAC: extend as needed for your production use-case

    # Fetch metrics
    entries = (
        BalanceSheetEntry.query.filter_by(company_id=company_id)
        .order_by(BalanceSheetEntry.year)
        .all()
    )
    years = sorted({e.year for e in entries})
    revenue = []
    assets = []
    liabilities = []
    for y in years:
        year_entries = [e for e in entries if e.year == y]

        # Find metrics by name (case-insensitive)
        def get_metric(name):
            for e in year_entries:
                if e.metric.lower() == name.lower():
                    return float(e.value)
            return None

        revenue.append(get_metric("Revenue"))
        assets.append(get_metric("Total Assets"))
        liabilities.append(get_metric("Total Liabilities"))
    return {
        "years": years,
        "revenue": revenue,
        "assets": assets,
        "liabilities": liabilities,
    }


# -------------------------------------------------------------------- #
#  Simple test route                                                   #
# -------------------------------------------------------------------- #
@app.get("/api/me")
@login_required()
def me():
    user = g.current_user
    return {"id": user.id, "username": user.username, "role": user.role}


@app.get("/api/health")
def health():
    ai_status = "available" if (llm and embeddings) else "unavailable"
    chroma_status = (
        "available" if os.path.exists("./chroma_db") else "not_initialized"
    )

    return jsonify(
        {
            "status": "healthy",
            "ai_components": ai_status,
            "chromadb": chroma_status,
            "database": "connected",
        }
    )


if __name__ == "__main__":
    app.run(debug=True)
