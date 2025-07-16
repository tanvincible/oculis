"""
SQLAlchemy models + helper functions
"""

from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

db = SQLAlchemy() # Initialize SQLAlchemy outside of any function

# Define roles as constants
ROLE_ADMIN = 'group_admin'
ROLE_CEO = 'ceo'
ROLE_ANALYST = 'analyst'
ALL_ROLES = {ROLE_ANALYST, ROLE_CEO, ROLE_ADMIN}

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(50), nullable=False, default=ROLE_ANALYST) # e.g., 'admin', 'ceo', 'analyst'
    company_id = db.Column(db.Integer, db.ForeignKey('company.id'), nullable=True)
    email = db.Column(db.String(120), unique=True, nullable=True) # Added email field
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    company = db.relationship('Company', backref='users')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f'<User {self.username} ({self.role})>'

class Company(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), unique=True, nullable=False)
    currency = db.Column(db.String(10), nullable=False, default='USD') # e.g., USD, INR, EUR
    parent_company_id = db.Column(db.Integer, db.ForeignKey('company.id'), nullable=True) # For hierarchy
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Self-referential relationship for parent/child companies
    parent = db.relationship('Company', remote_side=[id], backref='children')

    def __repr__(self):
        return f'<Company {self.name}>'

class BalanceSheet(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey('company.id'), nullable=False)
    year = db.Column(db.Integer, nullable=False)
    # Financial metrics - using Float for numerical values
    revenue = db.Column(db.Float, nullable=True)
    net_income = db.Column(db.Float, nullable=True)
    assets = db.Column(db.Float, nullable=True)
    liabilities = db.Column(db.Float, nullable=True)
    pdf_text = db.Column(db.Text, nullable=True) # Store extracted text for RAG

    company = db.relationship('Company', backref='balance_sheets')

    # Ensure unique balance sheet per company per year
    __table_args__ = (db.UniqueConstraint('company_id', 'year', name='_company_year_uc'),)

    def __repr__(self):
        return f'<BalanceSheet {self.company_id} - {self.year}>'

# CompanyUser for many-to-many if needed, but current design uses direct company_id on User
# class CompanyUser(db.Model):
#     __tablename__ = 'company_user'
#     company_id = db.Column(db.Integer, db.ForeignKey('company.id'), primary_key=True)
#     user_id = db.Column(db.Integer, db.ForeignKey('user.id'), primary_key=True)
#     assigned_at = db.Column(db.DateTime, default=datetime.utcnow)
