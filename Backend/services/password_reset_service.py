from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from flask import current_app

from extensions import db
from models.password_reset import PasswordReset
from models.user import User
from services.mail_service import mail_configured, send_email

RESET_TTL = timedelta(hours=1)
GENERIC_MESSAGE = (
    "If an account exists for that address, we sent password reset instructions."
)


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _reset_url(token: str) -> str:
    frontend = (current_app.config.get("FRONTEND_URL") or "http://localhost:3000").rstrip(
        "/"
    )
    return f"{frontend}/reset-password?token={token}"


def request_password_reset(email: str) -> dict:
    address = (email or "").strip().lower()
    if not address:
        raise ValueError("Email is required.")

    user = User.query.filter_by(email=address).first()
    if not user or not user.is_active:
        return {"message": GENERIC_MESSAGE, "reset_url": None}

    PasswordReset.query.filter_by(user_id=user.id).delete(synchronize_session=False)

    raw_token = secrets.token_urlsafe(32)
    reset = PasswordReset(
        user_id=user.id,
        token=_hash_token(raw_token),
        expires_at=datetime.now(timezone.utc) + RESET_TTL,
    )
    db.session.add(reset)
    db.session.commit()

    link = _reset_url(raw_token)
    emailed = False
    if mail_configured():
        try:
            emailed = send_email(
                to_address=user.email,
                subject="Reset your SomAI password",
                body=(
                    "Use this link to choose a new password. "
                    f"It expires in 1 hour.\n\n{link}\n"
                ),
                html=(
                    "<p>Use this link to choose a new SomAI password. "
                    "It expires in 1 hour.</p>"
                    f'<p><a href="{link}">Reset your password</a></p>'
                    f"<p>{link}</p>"
                ),
            )
        except Exception:
            current_app.logger.exception("Password reset email failed")
            emailed = False
    else:
        current_app.logger.warning(
            "Mail is not configured in Backend/.env — cannot send reset email. "
            "Set EMAIL_USER and EMAIL_PASS (or MAIL_USERNAME / MAIL_PASSWORD)."
        )

    if not emailed:
        current_app.logger.info("Password reset link for %s: %s", user.email, link)

    # Always return the link so local/dev still works if SMTP is missing or fails.
    return {
        "message": GENERIC_MESSAGE,
        "reset_url": link,
        "email_sent": emailed,
    }


def reset_password(token: str, password: str) -> User:
    raw = (token or "").strip()
    next_password = password or ""
    if not raw:
        raise ValueError("Reset link is invalid or expired.")
    if len(next_password) < 8:
        raise ValueError("Password must be at least 8 characters.")

    row = PasswordReset.query.filter_by(token=_hash_token(raw)).first()
    now = datetime.now(timezone.utc)
    expires = row.expires_at if row else None
    if expires is not None and expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)

    if row is None or expires is None or expires <= now:
        raise ValueError("Reset link is invalid or expired.")

    user = db.session.get(User, row.user_id)
    if not user:
        raise ValueError("Reset link is invalid or expired.")

    user.set_password(next_password)
    PasswordReset.query.filter_by(user_id=user.id).delete(synchronize_session=False)
    db.session.commit()
    return user
