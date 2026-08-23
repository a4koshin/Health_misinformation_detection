from datetime import datetime, timezone

from extensions import db


def _display_name(user) -> str | None:
    if not user:
        return None
    return (user.full_name or "").strip() or user.email.split("@")[0]


def _normalize_label(value: str | None) -> str | None:
    text = (value or "").strip()
    if not text:
        return None
    if text == "Misinformation":
        return "Non-Reliable"
    return text


class Prediction(db.Model):
    """Maps onto the existing Neon `predictions` table."""

    __tablename__ = "predictions"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey(
        "users.id"), nullable=False, index=True)
    claim_text = db.Column(db.Text, nullable=False)
    cleaned_text = db.Column(db.Text, nullable=True)
    label = db.Column(db.String(50), nullable=False)
    ai_label = db.Column(db.String(50), nullable=True)
    doctor_label = db.Column(db.String(50), nullable=True)
    confidence = db.Column(db.Float, nullable=False)
    label_confidence = db.Column(db.Float, nullable=True)
    topic = db.Column(db.String(100), nullable=True)
    topic_confidence = db.Column(db.Float, nullable=True)
    risk = db.Column(db.String(20), nullable=False)
    source = db.Column(db.String(50), nullable=False)
    summary = db.Column(db.Text, nullable=True)
    upload_batch_id = db.Column(db.Integer, nullable=True)
    needs_review = db.Column(db.Boolean, nullable=False, default=False)
    review_status = db.Column(db.String(20), nullable=True)
    advisor_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    assigned_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    assigned_at = db.Column(db.DateTime, nullable=True)
    advisor_note = db.Column(db.Text, nullable=True)
    corrected_claim_text = db.Column(db.Text, nullable=True)
    reviewed_at = db.Column(db.DateTime, nullable=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
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
        stored_source = (self.source or "").strip()
        is_corrected = (self.review_status or "") == "corrected" or bool(
            (self.corrected_claim_text or "").strip()
        )
        ai_label = _normalize_label(self.ai_label)
        doctor_label = _normalize_label(self.doctor_label)
        if not ai_label:
            ai_label = (
                "Non-Reliable"
                if is_corrected
                else _normalize_label(self.label)
            )
        if not doctor_label and is_corrected:
            doctor_label = "Reliable"
        if stored_source == "UploadedFile" or self.upload_batch_id:
            source_label = "UploadedFile"
        elif stored_source in {"Manual check", "File upload"}:
            source_label = stored_source
        else:
            source_label = "Manual check"
        return {
            # Flask/API fields
            "id": str(self.id),
            "user_id": str(self.user_id),
            "claim_text": self.claim_text,
            "is_medical": is_medical,
            "label": self.label,
            "ai_label": ai_label,
            "doctor_label": doctor_label,
            "label_confidence": confidence,
            "source": source_label,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "needs_review": bool(self.needs_review),
            "review_status": self.review_status,
            "advisor_note": self.advisor_note,
            "original_claim_text": self.claim_text,
            "corrected_claim_text": self.corrected_claim_text,
            "reviewed_at": self.reviewed_at.isoformat() if self.reviewed_at else None,
            "assigned_at": self.assigned_at.isoformat() if self.assigned_at else None,
            "assigned_by_id": str(self.assigned_by_id) if self.assigned_by_id else None,
            "is_active": bool(self.is_active if self.is_active is not None else True),
            # Frontend Detection compatibility
            "input_text": self.claim_text,
            "confidence": confidence,
            "somali_status": self.label or ("Non-medical" if not is_medical else "Pending"),
        }

    def to_review_dict(self) -> dict:
        payload = self.to_dict()
        payload["advisor_id"] = str(self.advisor_id) if self.advisor_id else None
        return payload

    @staticmethod
    def serialize_many(rows: list["Prediction"], *, review: bool = False) -> list[dict]:
        from models.user import User

        user_ids = {row.user_id for row in rows}
        user_ids.update(row.advisor_id for row in rows if row.advisor_id)
        user_ids.update(row.assigned_by_id for row in rows if row.assigned_by_id)
        users = (
            {user.id: user for user in User.query.filter(User.id.in_(user_ids)).all()}
            if user_ids
            else {}
        )
        items = []
        for row in rows:
            payload = row.to_review_dict() if review else row.to_dict()
            owner = users.get(row.user_id)
            advisor = users.get(row.advisor_id) if row.advisor_id else None
            assigned_by = (
                users.get(row.assigned_by_id) if row.assigned_by_id else None
            )
            payload["user_name"] = _display_name(owner)
            payload["user_email"] = owner.email if owner else None
            payload["advisor_name"] = _display_name(advisor)
            payload["assigned_by_name"] = _display_name(assigned_by)
            items.append(payload)
        return items
