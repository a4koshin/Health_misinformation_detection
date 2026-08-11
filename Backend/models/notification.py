from datetime import datetime, timezone

from extensions import db


class Notification(db.Model):
    __tablename__ = "notifications"

    id = db.Column(db.Integer, primary_key=True)
    recipient_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=False, index=True
    )
    audience = db.Column(db.String(32), nullable=False, index=True)
    type = db.Column(db.String(40), nullable=False, index=True)
    title = db.Column(db.String(180), nullable=False)
    body = db.Column(db.Text, nullable=False)
    prediction_id = db.Column(db.Integer, nullable=True, index=True)
    actor_id = db.Column(db.Integer, nullable=True)
    actor_role = db.Column(db.String(32), nullable=True)
    actor_name = db.Column(db.String(120), nullable=True)
    other_user_id = db.Column(db.Integer, nullable=True)
    other_user_name = db.Column(db.String(120), nullable=True)
    claim_excerpt = db.Column(db.Text, nullable=True)
    corrected_excerpt = db.Column(db.Text, nullable=True)
    href = db.Column(db.String(120), nullable=True)
    read_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )

    def to_dict(self) -> dict:
        return {
            "id": str(self.id),
            "recipient_id": str(self.recipient_id),
            "audience": self.audience,
            "type": self.type,
            "title": self.title,
            "body": self.body,
            "prediction_id": str(self.prediction_id)
            if self.prediction_id is not None
            else None,
            "actor_id": str(self.actor_id) if self.actor_id is not None else None,
            "actor_role": self.actor_role,
            "actor_name": self.actor_name,
            "other_user_id": str(self.other_user_id)
            if self.other_user_id is not None
            else None,
            "other_user_name": self.other_user_name,
            "claim_excerpt": self.claim_excerpt,
            "corrected_excerpt": self.corrected_excerpt,
            "href": self.href,
            "read_at": self.read_at.isoformat() if self.read_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "unread": self.read_at is None,
        }
