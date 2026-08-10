from datetime import datetime, timezone

from extensions import db


class PasswordReset(db.Model):
    """Matches the existing `password_resets` table (token, no used_at)."""

    __tablename__ = "password_resets"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=False, index=True
    )
    token = db.Column(db.String(255), nullable=False, unique=True, index=True)
    expires_at = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
