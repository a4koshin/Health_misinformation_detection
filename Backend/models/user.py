from datetime import datetime, timezone

from werkzeug.security import check_password_hash, generate_password_hash

from extensions import db

# Allowed role strings: "user", "admin", "doctor".
# Assign roles via the admin Users / Doctors pages.
# Not self-service — registration always creates role="user".


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
    language_preference = db.Column(
        db.String(10), nullable=False, default="so")
    # When this account became a doctor. Review queue starts here.
    advisor_since = db.Column(db.DateTime, nullable=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    deletion_requested_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    @property
    def is_doctor(self) -> bool:
        value = (self.role or "").strip().lower()
        return value in {"doctor", "healthcare_advisor"}

    # Backward-compatible alias during migration.
    @property
    def is_healthcare_advisor(self) -> bool:
        return self.is_doctor

    def to_dict(self) -> dict:
        role = self.role or "user"
        if role.lower() == "healthcare_advisor":
            role = "doctor"
        return {
            "id": str(self.id),
            "email": self.email,
            "full_name": self.full_name,
            "name": self.full_name,
            "role": role,
            "is_active": bool(self.is_active),
            "deletion_requested_at": (
                self.deletion_requested_at.isoformat()
                if self.deletion_requested_at
                else None
            ),
            "avatar_url": self.avatar_url,
            "language_preference": self.language_preference or "so",
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "advisor_since": (
                self.advisor_since.isoformat() if self.advisor_since else None
            ),
        }

    def to_settings_profile(self) -> dict:
        role = self.role or "user"
        if role.lower() == "healthcare_advisor":
            role = "doctor"
        return {
            "name": self.full_name,
            "email": self.email,
            "avatar_url": self.avatar_url,
            "is_active": bool(self.is_active),
            "deletion_requested_at": (
                self.deletion_requested_at.isoformat()
                if self.deletion_requested_at
                else None
            ),
            "language_preference": self.language_preference or "so",
            "role": role,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
