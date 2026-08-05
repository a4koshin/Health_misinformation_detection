from datetime import datetime, timezone

from extensions import db


class Prediction(db.Model):
    """Maps onto the existing Neon `predictions` table."""

    __tablename__ = "predictions"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey(
        "users.id"), nullable=False, index=True)
    claim_text = db.Column(db.Text, nullable=False)
    cleaned_text = db.Column(db.Text, nullable=True)
    label = db.Column(db.String(50), nullable=False)
    confidence = db.Column(db.Float, nullable=False)
    label_confidence = db.Column(db.Float, nullable=True)
    topic = db.Column(db.String(100), nullable=True)
    topic_confidence = db.Column(db.Float, nullable=True)
    risk = db.Column(db.String(20), nullable=False)
    source = db.Column(db.String(50), nullable=False)
    summary = db.Column(db.Text, nullable=True)
    upload_batch_id = db.Column(db.Integer, nullable=True)
    created_at = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    def to_dict(self) -> dict:
        confidence = (
            self.label_confidence
            if self.label_confidence is not None
            else self.confidence
        )
        is_medical = self.source != "non_medical"
        source_label = "File upload" if self.upload_batch_id else "Manual check"
        return {
            # Flask/API fields
            "id": str(self.id),
            "user_id": str(self.user_id),
            "claim_text": self.claim_text,
            "is_medical": is_medical,
            "label": self.label,
            "label_confidence": confidence,
            "category": self.topic,
            "topic": self.topic,
            "topic_confidence": None,
            "source": source_label,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            # Frontend Detection compatibility
            "input_text": self.claim_text,
            "confidence": confidence,
            "somali_status": self.label or ("Non-medical" if not is_medical else "Pending"),
        }
