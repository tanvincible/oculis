"""
Upload endpoint logic isolated for testability
"""

import os
import tempfile
import pandas as pd
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from models import db, Company, BalanceSheetEntry
from auth import login_required, ROLE_ADMIN

ALLOWED_EXT = {".csv", ".xls", ".xlsx"}
REQUIRED_COLS = {"Company Name", "Year", "Metric", "Value", "Currency"}

bp = Blueprint("ingest", __name__, url_prefix="/api")


@bp.route("/upload_balance_sheet", methods=["POST"])
@login_required(role=ROLE_ADMIN)
def upload():
    if "file" not in request.files:
        return jsonify({"error": "no file part"}), 400
    f = request.files["file"]
    if f.filename == "":
        return jsonify({"error": "empty filename"}), 400

    ext = os.path.splitext(f.filename)[1].lower()
    if ext not in ALLOWED_EXT:
        return jsonify({"error": "unsupported file type"}), 415

    # Save to temp file then read with pandas
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        fname = secure_filename(f.filename)  # strips dangerous chars
        tmp.write(f.read())
        tmp_path = tmp.name
    try:
        df = (
            pd.read_excel(tmp_path)
            if ext in {".xls", ".xlsx"}
            else pd.read_csv(tmp_path)
        )
    finally:
        os.unlink(tmp_path)

    # column validation
    if set(df.columns) < REQUIRED_COLS:
        return jsonify({"error": f"columns must include {REQUIRED_COLS}"}), 400

    # Insert rows
    inserted = 0
    for _, row in df.iterrows():
        company = Company.query.filter_by(name=row["Company Name"]).first()
        if not company:
            company = Company(name=row["Company Name"])
            db.session.add(company)
            db.session.flush()  # populate id
        entry = BalanceSheetEntry(
            company_id=company.id,
            year=int(row["Year"]),
            metric=row["Metric"],
            value=row["Value"],
            currency=row["Currency"],
        )
        db.session.merge(entry)  # upsert by unique constraint
        inserted += 1
    db.session.commit()
    return jsonify({"inserted": inserted}), 201
