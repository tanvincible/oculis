"""
Very small auth layer: session cookie + @login_required decorator
"""

from functools import wraps
from werkzeug.security import generate_password_hash, check_password_hash
from flask import session, g, redirect, url_for, request, jsonify
from models import db, User, ROLE_ADMIN

SESSION_USER_ID = "uid"


def login_required(role: str | None = None):
    """
    If `role` is given, user must have that role (or admin).
    """

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            uid = session.get(SESSION_USER_ID)
            if not uid:
                return jsonify({"error": "login required"}), 401

            user = User.query.get(uid)
            if not user:
                session.pop(SESSION_USER_ID, None)
                return jsonify({"error": "invalid session"}), 401

            if role and not (user.role == role or user.is_admin()):
                return jsonify({"error": "forbidden"}), 403

            g.current_user = user
            return fn(*args, **kwargs)

        return wrapper

    return decorator


def hash_pwd(pwd: str) -> str:
    return generate_password_hash(pwd)


def verify_pwd(hash_, pwd: str) -> bool:
    return check_password_hash(hash_, pwd)
