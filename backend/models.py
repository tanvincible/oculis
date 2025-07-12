"""
SQLAlchemy models + helper functions
"""

from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

ROLE_ANALYST = "analyst"
ROLE_CEO = "ceo"
ROLE_ADMIN = "admin"
ALL_ROLES = {ROLE_ANALYST, ROLE_CEO, ROLE_ADMIN}


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(16), nullable=False, default=ROLE_ANALYST)

    def is_admin(self):
        return self.role == ROLE_ADMIN


class Company(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class BalanceSheetEntry(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(
        db.Integer, db.ForeignKey("company.id"), nullable=False
    )
    year = db.Column(db.Integer, nullable=False)
    metric = db.Column(db.String(120), nullable=False)
    value = db.Column(db.Numeric, nullable=False)
    currency = db.Column(db.String(16), nullable=False)

    company = db.relationship(
        "Company", backref=db.backref("entries", lazy=True)
    )

    __table_args__ = (
        db.UniqueConstraint(
            "company_id", "year", "metric", name="uq_company_year_metric"
        ),
    )
