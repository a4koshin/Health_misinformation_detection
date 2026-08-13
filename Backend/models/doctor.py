from datetime import datetime, timezone

from extensions import db


class Doctor(db.Model):
    """Professional profile for users with role=doctor (admin-created only)."""

    __tablename__ = "doctors"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False,
        unique=True,
        index=True,
    )
    name = db.Column(db.String(120), nullable=False)
    # Stored path to uploaded license card/document image (or PDF).
    license = db.Column(db.String(255), nullable=False)
    # Stored path to doctor profile photo.
    profile_image = db.Column(db.String(255), nullable=False)
    job_title = db.Column(db.String(120), nullable=False)
    workplace = db.Column(db.String(180), nullable=False)
    created_at = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    def to_dict(self, user=None) -> dict:
        payload = {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "name": self.name,
            "license": self.license,
            "license_url": self.license,
            "profile_image": self.profile_image,
            "profile_image_url": self.profile_image,
            "job_title": self.job_title,
            "workplace": self.workplace,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        if user is not None:
            payload["email"] = user.email
            payload["role"] = user.role
            payload["is_active"] = bool(user.is_active)
            payload["full_name"] = user.full_name
            payload["avatar_url"] = user.avatar_url or self.profile_image
        return payload
