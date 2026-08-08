"""Seed the local admin account from Backend/.env."""

from __future__ import annotations

import os

from extensions import db
from models.user import User


def _admin_credentials() -> tuple[str, str, str] | None:
    email = (
        os.getenv("ADMIN_USER")
        or os.getenv("ADMIN_EMAIL")
        or ""
    ).strip().lower()
    password = (os.getenv("ADMIN_PASSWORD") or os.getenv("PASSWORD") or "").strip()
    name = (os.getenv("ADMIN_NAME") or "Admin").strip() or "Admin"
    if not email or not password:
        return None
    return email, password, name


def seed_admin() -> User | None:
    """Create or update the admin user from ADMIN_USER / PASSWORD."""
    creds = _admin_credentials()
    if creds is None:
        return None

    email, password, name = creds
    user = User.query.filter_by(email=email).first()
    if user is None:
        user = User(email=email, full_name=name, role="admin")
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        print(f"[seed] Created admin user {email}")
        return user

    changed = False
    if (user.role or "").lower() != "admin":
        user.role = "admin"
        changed = True
    if not user.check_password(password):
        user.set_password(password)
        changed = True
    if not user.full_name:
        user.full_name = name
        changed = True
    if changed:
        db.session.commit()
        print(f"[seed] Updated admin user {email}")
    else:
        print(f"[seed] Admin user already present: {email}")
    return user
