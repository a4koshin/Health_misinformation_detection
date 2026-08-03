from datetime import datetime, timezone

from werkzeug.security import check_password_hash, generate_password_hash

from extensions import db


class User(db.Model):
    """Matches Neon users table (column is full_name, not name)."""

    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    full_name = db.Column("full_name", db.String(120), nullable=True)
    role = db.Column(db.String(20), nullable=False, default="user")
    # Neon already has avatar_path; expose as avatar_url in the API.
    avatar_url = db.Column("avatar_path", db.String(255), nullable=True)
    language_preference = db.Column(db.String(10), nullable=False, default="so")
    created_at = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def to_dict(self) -> dict:
        return {
            "id": str(self.id),
            "email": self.email,
            "full_name": self.full_name,
            "name": self.full_name,
            "role": self.role or "user",
            "avatar_url": self.avatar_url,
            "language_preference": self.language_preference or "so",
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def to_settings_profile(self) -> dict:
        return {
            "name": self.full_name,
            "email": self.email,
            "avatar_url": self.avatar_url,
            "language_preference": self.language_preference or "so",
            "role": "user",
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
