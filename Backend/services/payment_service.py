"""Admin payment history for EVC Plus appointment charges."""

from __future__ import annotations

from datetime import datetime, timezone

from extensions import db
from models.doctor import Doctor
from models.payment import PaymentTransaction
from models.user import User


def classify_outcome(message: str | None, *, code: str | None = None) -> str:
    """Map gateway / user-facing text to success | rejected | failed."""
    lower = (message or "").lower()
    code_l = (code or "").lower()
    if any(
        token in lower
        for token in (
            "reject",
            "cancelled",
            "canceled",
            "aborted",
            "user aborted",
        )
    ) or code_l in {"rejected", "aborted", "cancelled"}:
        return "rejected"
    return "failed"


def record_attempt(
    *,
    user: User,
    status: str,
    amount: str | float | None = None,
    currency: str | None = "USD",
    payment_method: str | None = "EVC Plus",
    payer_phone: str | None = None,
    doctor_user_id: int | None = None,
    prediction_id: int | None = None,
    appointment_id: int | None = None,
    payment_reference: str | None = None,
    payment_invoice_id: str | None = None,
    payment_request_id: str | None = None,
    response_code: str | None = None,
    message: str | None = None,
    commit: bool = False,
) -> PaymentTransaction:
    amount_str = None
    if amount is not None:
        amount_str = f"{float(amount):.2f}" if isinstance(amount, (int, float)) else str(amount)

    row = PaymentTransaction(
        user_id=user.id,
        doctor_user_id=doctor_user_id,
        prediction_id=prediction_id,
        appointment_id=appointment_id,
        status=status,
        amount=amount_str,
        currency=currency,
        payment_method=payment_method,
        payer_phone=payer_phone,
        payment_reference=payment_reference,
        payment_invoice_id=payment_invoice_id,
        payment_request_id=payment_request_id,
        response_code=response_code,
        message=(message or "").strip() or None,
        created_at=datetime.now(timezone.utc),
    )
    db.session.add(row)
    if commit:
        db.session.commit()
    return row


def list_payments(limit: int = 500) -> list[dict]:
    limit = max(1, min(int(limit or 500), 1000))
    rows = (
        PaymentTransaction.query.order_by(PaymentTransaction.created_at.desc())
        .limit(limit)
        .all()
    )
    if not rows:
        return []

    user_ids = {r.user_id for r in rows}
    doctor_ids = {r.doctor_user_id for r in rows if r.doctor_user_id}

    users = {
        u.id: u
        for u in User.query.filter(User.id.in_(user_ids)).all()
    } if user_ids else {}
    doctors = {
        u.id: u
        for u in User.query.filter(User.id.in_(doctor_ids)).all()
    } if doctor_ids else {}
    profiles = {
        p.user_id: p
        for p in Doctor.query.filter(Doctor.user_id.in_(doctor_ids)).all()
    } if doctor_ids else {}

    return [
        row.to_dict(
            user=users.get(row.user_id),
            doctor=doctors.get(row.doctor_user_id) if row.doctor_user_id else None,
            doctor_profile=profiles.get(row.doctor_user_id)
            if row.doctor_user_id
            else None,
        )
        for row in rows
    ]
