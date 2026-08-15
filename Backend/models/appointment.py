from datetime import datetime, timezone

from extensions import db
from models.availability import isoformat_utc


class Appointment(db.Model):
    """User request to speak with the doctor who corrected a claim."""

    __tablename__ = "appointments"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    doctor_user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    prediction_id = db.Column(
        db.Integer,
        db.ForeignKey("predictions.id"),
        nullable=False,
        index=True,
    )
    availability_id = db.Column(
        db.Integer,
        db.ForeignKey("doctor_availability.id"),
        nullable=True,
        index=True,
    )
    starts_at = db.Column(db.DateTime, nullable=True, index=True)
    ends_at = db.Column(db.DateTime, nullable=True)
    note = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), nullable=False, default="pending", index=True)
    payment_status = db.Column(
        db.String(20), nullable=False, default="unpaid", index=True
    )
    payment_amount = db.Column(db.String(20), nullable=True)
    payment_currency = db.Column(db.String(8), nullable=True)
    payment_method = db.Column(db.String(40), nullable=True)
    payer_phone = db.Column(db.String(20), nullable=True)
    payment_reference = db.Column(db.String(64), nullable=True)
    payment_invoice_id = db.Column(db.String(64), nullable=True)
    payment_request_id = db.Column(db.String(64), nullable=True)
    paid_at = db.Column(db.DateTime, nullable=True)
    queue_number = db.Column(db.Integer, nullable=True, index=True)
    created_at = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    def to_dict(
        self,
        *,
        user=None,
        doctor=None,
        doctor_profile=None,
        prediction=None,
    ) -> dict:
        doctor_name = None
        if doctor_profile is not None:
            doctor_name = doctor_profile.name
        elif doctor is not None:
            doctor_name = (doctor.full_name or "").strip() or doctor.email.split("@")[0]

        claim = None
        corrected = None
        if prediction is not None:
            claim = prediction.claim_text or ""
            corrected = prediction.corrected_claim_text

        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "doctor_user_id": str(self.doctor_user_id),
            "prediction_id": str(self.prediction_id),
            "availability_id": str(self.availability_id)
            if self.availability_id
            else None,
            "starts_at": isoformat_utc(self.starts_at),
            "ends_at": isoformat_utc(self.ends_at),
            "note": self.note,
            "status": self.status,
            "payment_status": self.payment_status or "unpaid",
            "payment_amount": self.payment_amount,
            "payment_currency": self.payment_currency,
            "payment_method": self.payment_method,
            "payer_phone": self.payer_phone,
            "payment_reference": self.payment_reference,
            "payment_invoice_id": self.payment_invoice_id,
            "paid_at": isoformat_utc(self.paid_at),
            "queue_number": self.queue_number,
            "created_at": isoformat_utc(self.created_at),
            "updated_at": isoformat_utc(self.updated_at),
            "user_name": (
                ((user.full_name or "").strip() or user.email.split("@")[0])
                if user
                else None
            ),
            "user_email": user.email if user else None,
            "doctor_name": doctor_name,
            "doctor_job_title": (
                doctor_profile.job_title if doctor_profile is not None else None
            ),
            "doctor_workplace": (
                doctor_profile.workplace if doctor_profile is not None else None
            ),
            "claim_text": claim,
            "corrected_claim_text": corrected,
        }
