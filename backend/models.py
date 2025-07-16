"""
SQLAlchemy models + helper functions
"""

from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

db = SQLAlchemy()

# Define roles
ROLE_ADMIN = "group_admin"
ROLE_CEO = "ceo"
ROLE_ANALYST = "analyst"
ALL_ROLES = {ROLE_ANALYST, ROLE_CEO, ROLE_ADMIN}


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(50), nullable=False, default=ROLE_ANALYST)
    company_id = db.Column(
        db.Integer, db.ForeignKey("company.id"), nullable=True
    )
    email = db.Column(db.String(120), unique=True, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    company = db.relationship("Company", backref="users")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def is_admin(self):
        return self.role == ROLE_ADMIN

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "role": self.role,
            "company_id": self.company_id,
            "email": self.email,
            "created_at": self.created_at.isoformat(),
        }

    def __repr__(self):
        return f"<User {self.username} ({self.role})>"


class Company(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), unique=True, nullable=False)
    currency = db.Column(db.String(10), nullable=False, default="USD")
    parent_company_id = db.Column(
        db.Integer, db.ForeignKey("company.id"), nullable=True
    )

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    parent = db.relationship("Company", remote_side=[id], backref="children")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "currency": self.currency,
            "parent_company_id": self.parent_company_id,
            "created_at": self.created_at.isoformat(),
        }

    def __repr__(self):
        return f"<Company {self.name}>"


class BalanceSheet(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(
        db.Integer, db.ForeignKey("company.id"), nullable=False
    )
    year = db.Column(db.Integer, nullable=False)

    revenue = db.Column(db.Float, nullable=True)
    net_income = db.Column(db.Float, nullable=True)
    assets = db.Column(db.Float, nullable=True)
    liabilities = db.Column(db.Float, nullable=True)
    pdf_text = db.Column(db.Text, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    company = db.relationship("Company", backref="balance_sheets")

    __table_args__ = (
        db.UniqueConstraint("company_id", "year", name="_company_year_uc"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "company_id": self.company_id,
            "year": self.year,
            "revenue": self.revenue,
            "net_income": self.net_income,
            "assets": self.assets,
            "liabilities": self.liabilities,
            "created_at": self.created_at.isoformat(),
        }

    def __repr__(self):
        return f"<BalanceSheet {self.company_id} - {self.year}>"
