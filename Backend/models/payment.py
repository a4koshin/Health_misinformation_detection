from datetime import datetime, timezone

from extensions import db
from models.availability import isoformat_utc


class PaymentTransaction(db.Model):
    """EVC Plus appointment payment attempt (success, rejected, or failed)."""

    __tablename__ = "payment_transactions"

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
        nullable=True,
        index=True,
    )
    prediction_id = db.Column(
        db.Integer,
        db.ForeignKey("predictions.id"),
        nullable=True,
        index=True,
    )
    appointment_id = db.Column(
        db.Integer,
        db.ForeignKey("appointments.id"),
        nullable=True,
        index=True,
    )
    status = db.Column(db.String(20), nullable=False, index=True)
    amount = db.Column(db.String(20), nullable=True)
    currency = db.Column(db.String(8), nullable=True)
    payment_method = db.Column(db.String(40), nullable=True)
    payer_phone = db.Column(db.String(20), nullable=True)
    payment_reference = db.Column(db.String(64), nullable=True)
    payment_invoice_id = db.Column(db.String(64), nullable=True)
    payment_request_id = db.Column(db.String(64), nullable=True)
    response_code = db.Column(db.String(40), nullable=True)
    message = db.Column(db.Text, nullable=True)
    created_at = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )

    def to_dict(
        self,
        *,
        user=None,
        doctor=None,
        doctor_profile=None,
    ) -> dict:
        user_name = None
        user_email = None
        if user is not None:
            user_name = (user.full_name or "").strip() or user.email.split("@")[0]
            user_email = user.email

        doctor_name = None
        if doctor_profile is not None:
            doctor_name = doctor_profile.name
        elif doctor is not None:
            doctor_name = (doctor.full_name or "").strip() or doctor.email.split("@")[0]

        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "doctor_user_id": str(self.doctor_user_id)
            if self.doctor_user_id is not None
            else None,
            "prediction_id": str(self.prediction_id)
            if self.prediction_id is not None
            else None,
            "appointment_id": str(self.appointment_id)
            if self.appointment_id is not None
            else None,
            "status": self.status,
            "amount": self.amount,
            "currency": self.currency,
            "payment_method": self.payment_method,
            "payer_phone": self.payer_phone,
            "payment_reference": self.payment_reference,
            "payment_invoice_id": self.payment_invoice_id,
            "payment_request_id": self.payment_request_id,
            "response_code": self.response_code,
            "message": self.message,
            "created_at": isoformat_utc(self.created_at),
            "user_name": user_name,
            "user_email": user_email,
            "doctor_name": doctor_name,
        }
