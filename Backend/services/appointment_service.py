from datetime import datetime, timedelta, timezone

from extensions import db
from models.appointment import Appointment
from models.availability import DoctorAvailability
from models.doctor import Doctor
from models.prediction import Prediction
from models.user import User
from services import notification_service

ACTIVE_STATUSES = ("pending", "confirmed")
DEFAULT_DURATION = timedelta(hours=1)
SLOT_MINUTES = 60


def _aware(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _naive_utc(value: datetime) -> datetime:
    return _aware(value).replace(tzinfo=None)


def _parse_datetime(value) -> datetime:
    if isinstance(value, datetime):
        return _aware(value)
    text = str(value or "").strip()
    if not text:
        raise ValueError("Date and time are required.")
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"
    try:
        parsed = datetime.fromisoformat(text)
    except ValueError as exc:
        raise ValueError("Enter a valid date and time.") from exc
    return _aware(parsed)


def _booked_availability_ids(doctor_user_id: int) -> set[int]:
    rows = (
        Appointment.query.filter(
            Appointment.doctor_user_id == doctor_user_id,
            Appointment.status.in_(ACTIVE_STATUSES),
            Appointment.availability_id.isnot(None),
        )
        .all()
    )
    return {row.availability_id for row in rows if row.availability_id}


def _next_queue_number(*, doctor_user_id: int, starts_at: datetime) -> int:
    """Hospital-style queue: next integer for this doctor on this UTC calendar day."""
    day = _naive_utc(starts_at).date()
    day_start = datetime(day.year, day.month, day.day)
    day_end = day_start + timedelta(days=1)

    # Lock same-day rows so concurrent bookings do not share a number.
    (
        Appointment.query.filter(
            Appointment.doctor_user_id == doctor_user_id,
            Appointment.starts_at >= day_start,
            Appointment.starts_at < day_end,
        )
        .with_for_update()
        .all()
    )
    current_max = (
        db.session.query(db.func.max(Appointment.queue_number))
        .filter(
            Appointment.doctor_user_id == doctor_user_id,
            Appointment.starts_at >= day_start,
            Appointment.starts_at < day_end,
        )
        .scalar()
    )
    return int(current_max or 0) + 1


def serialize_appointment(row: Appointment) -> dict:
    user = db.session.get(User, row.user_id)
    doctor = db.session.get(User, row.doctor_user_id)
    profile = Doctor.query.filter_by(user_id=row.doctor_user_id).first()
    prediction = db.session.get(Prediction, row.prediction_id)
    return row.to_dict(
        user=user,
        doctor=doctor,
        doctor_profile=profile,
        prediction=prediction,
    )


def list_appointments(actor: User) -> list[dict]:
    role = (actor.role or "").strip().lower()
    query = Appointment.query
    if role == "admin":
        pass
    elif actor.is_doctor:
        query = query.filter_by(doctor_user_id=actor.id)
    else:
        query = query.filter_by(user_id=actor.id)
    rows = query.order_by(
        Appointment.starts_at.desc().nullslast(),
        Appointment.created_at.desc(),
    ).all()
    return [serialize_appointment(row) for row in rows]


def list_availability(*, actor: User, doctor_user_id: int | None = None) -> list[dict]:
    role = (actor.role or "").strip().lower()
    target_id = doctor_user_id
    if actor.is_doctor and role != "admin":
        target_id = actor.id
    elif role == "user":
        if not target_id:
            raise ValueError("doctor_user_id is required.")
    elif role == "admin" and not target_id:
        raise ValueError("doctor_user_id is required.")

    doctor = db.session.get(User, target_id)
    if not doctor or not doctor.is_doctor:
        raise LookupError("Doctor not found.")

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    slots = (
        DoctorAvailability.query.filter_by(doctor_user_id=target_id)
        .order_by(DoctorAvailability.starts_at.asc())
        .all()
    )
    booked = _booked_availability_ids(target_id)
    items = []
    for slot in slots:
        starts = slot.starts_at
        is_booked = slot.id in booked
        if role == "user" and (is_booked or starts <= now):
            continue
        items.append(slot.to_dict(booked=is_booked))
    return items


def create_availability(
    *,
    doctor: User,
    starts_at,
    ends_at=None,
) -> list[DoctorAvailability]:
    """Publish a working window; store one 1-hour patient slot per interval."""
    if not doctor.is_doctor:
        raise PermissionError("Only doctors can set available times.")

    start = _parse_datetime(starts_at).replace(tzinfo=None, second=0, microsecond=0)
    end = (
        _parse_datetime(ends_at).replace(tzinfo=None, second=0, microsecond=0)
        if ends_at
        else start + DEFAULT_DURATION
    )
    if end <= start:
        raise ValueError("End time must be after the start time.")
    if start <= datetime.now(timezone.utc).replace(tzinfo=None):
        raise ValueError("Choose a future date and time.")

    total_minutes = int((end - start).total_seconds() // 60)
    if total_minutes < SLOT_MINUTES:
        raise ValueError("Availability must cover at least 1 hour.")
    if start.minute != 0 or start.second != 0:
        raise ValueError("Start time must be on the hour (e.g. 11:00).")
    if end.minute != 0 or end.second != 0:
        raise ValueError("End time must be on the hour (e.g. 20:00).")
    if total_minutes % SLOT_MINUTES != 0:
        raise ValueError("Working hours must split evenly into 1-hour patient slots.")

    overlap = DoctorAvailability.query.filter(
        DoctorAvailability.doctor_user_id == doctor.id,
        DoctorAvailability.starts_at < end,
        DoctorAvailability.ends_at > start,
    ).first()
    if overlap:
        raise ValueError("That time overlaps another available slot.")

    slots: list[DoctorAvailability] = []
    cursor = start
    while cursor + DEFAULT_DURATION <= end:
        slots.append(
            DoctorAvailability(
                doctor_user_id=doctor.id,
                starts_at=cursor,
                ends_at=cursor + DEFAULT_DURATION,
            )
        )
        cursor += DEFAULT_DURATION

    if not slots:
        raise ValueError("No 1-hour slots could be created for that window.")

    db.session.add_all(slots)
    db.session.commit()
    return slots


def delete_availability(*, doctor: User, availability_id: int) -> None:
    if not doctor.is_doctor:
        raise PermissionError("Only doctors can remove available times.")
    slot = db.session.get(DoctorAvailability, availability_id)
    if not slot or slot.doctor_user_id != doctor.id:
        raise LookupError("Available time not found.")
    if slot.id in _booked_availability_ids(doctor.id):
        raise ValueError("This time is already booked.")
    db.session.delete(slot)
    db.session.commit()


def create_appointment(
    *,
    user: User,
    prediction_id: int,
    availability_id: int,
    note: str | None = None,
    payer_phone: str | None = None,
) -> Appointment:
    from services import evc_plus_service, payment_service
    from services.evc_plus_service import EvcPlusError

    if (user.role or "").strip().lower() != "user":
        raise PermissionError("Only users can book appointments.")

    prediction = db.session.get(Prediction, prediction_id)
    if not prediction or prediction.is_active is False:
        raise LookupError("Correction not found.")
    if prediction.user_id != user.id:
        raise PermissionError("You can only book from your own corrections.")
    if (prediction.review_status or "") != "corrected":
        raise ValueError("Book an appointment after a doctor has corrected this claim.")
    if not prediction.advisor_id:
        raise ValueError("This correction has no doctor assigned.")

    doctor = db.session.get(User, prediction.advisor_id)
    if not doctor or not doctor.is_doctor or not doctor.is_active:
        raise ValueError("This doctor is not available for appointments.")

    slot = db.session.get(DoctorAvailability, availability_id)
    if not slot or slot.doctor_user_id != doctor.id:
        raise LookupError("That available time was not found.")
    if slot.starts_at <= datetime.now(timezone.utc).replace(tzinfo=None):
        raise ValueError("That time has already passed. Choose another slot.")
    if slot.id in _booked_availability_ids(doctor.id):
        raise ValueError("That time is already booked. Choose another slot.")

    # Every patient booking is exactly one 1-hour availability slot.
    slot_end = slot.ends_at or (slot.starts_at + DEFAULT_DURATION)
    duration_seconds = (slot_end - slot.starts_at).total_seconds()
    if abs(duration_seconds - SLOT_MINUTES * 60) > 1:
        raise ValueError("Only 1-hour appointment slots can be booked.")

    existing = (
        Appointment.query.filter(
            Appointment.user_id == user.id,
            Appointment.prediction_id == prediction.id,
            Appointment.status.in_(ACTIVE_STATUSES),
        )
        .order_by(Appointment.created_at.desc())
        .first()
    )
    if existing:
        raise ValueError("You already have an appointment request for this correction.")

    cleaned_note = " ".join((note or "").split()).strip() or None
    if cleaned_note and len(cleaned_note) > 800:
        raise ValueError("Note must be 800 characters or fewer.")

    pay_cfg = evc_plus_service.payment_config()
    payment_fields: dict = {
        "payment_status": "waived",
        "payment_amount": None,
        "payment_currency": None,
        "payment_method": None,
        "payer_phone": None,
        "payment_reference": None,
        "payment_invoice_id": None,
        "payment_request_id": None,
        "paid_at": None,
    }

    if pay_cfg["enabled"]:
        try:
            receipt = evc_plus_service.purchase(
                payer_phone=payer_phone or "",
                amount=pay_cfg["amount"],
                description=f"SomAI appointment #{prediction.id}",
            )
        except EvcPlusError as exc:
            outcome = payment_service.classify_outcome(
                str(exc), code=getattr(exc, "code", None)
            )
            payment_service.record_attempt(
                user=user,
                status=outcome,
                amount=pay_cfg["amount"],
                currency=pay_cfg.get("currency") or "USD",
                payer_phone=(payer_phone or "").strip() or None,
                doctor_user_id=doctor.id,
                prediction_id=prediction.id,
                response_code=getattr(exc, "code", None),
                message=str(exc),
                commit=True,
            )
            raise ValueError(str(exc)) from exc
        except ValueError as exc:
            payment_service.record_attempt(
                user=user,
                status="failed",
                amount=pay_cfg["amount"],
                currency=pay_cfg.get("currency") or "USD",
                payer_phone=(payer_phone or "").strip() or None,
                doctor_user_id=doctor.id,
                prediction_id=prediction.id,
                message=str(exc),
                commit=True,
            )
            raise

        payment_fields = {
            "payment_status": "paid",
            "payment_amount": receipt.amount,
            "payment_currency": receipt.currency,
            "payment_method": "EVC Plus",
            "payer_phone": receipt.payer_account,
            "payment_reference": receipt.reference_id,
            "payment_invoice_id": receipt.invoice_id,
            "payment_request_id": receipt.request_id,
            "paid_at": datetime.now(timezone.utc),
        }
    # When payment is disabled, bookings are free (local/dev).

    queue_number = _next_queue_number(
        doctor_user_id=doctor.id,
        starts_at=slot.starts_at,
    )

    appointment = Appointment(
        user_id=user.id,
        doctor_user_id=doctor.id,
        prediction_id=prediction.id,
        availability_id=slot.id,
        starts_at=slot.starts_at,
        ends_at=slot_end,
        note=cleaned_note,
        status="pending",
        queue_number=queue_number,
        **payment_fields,
    )
    db.session.add(appointment)
    db.session.flush()

    if payment_fields.get("payment_status") == "paid":
        payment_service.record_attempt(
            user=user,
            status="success",
            amount=payment_fields.get("payment_amount"),
            currency=payment_fields.get("payment_currency") or "USD",
            payer_phone=payment_fields.get("payer_phone"),
            doctor_user_id=doctor.id,
            prediction_id=prediction.id,
            appointment_id=appointment.id,
            payment_reference=payment_fields.get("payment_reference"),
            payment_invoice_id=payment_fields.get("payment_invoice_id"),
            payment_request_id=payment_fields.get("payment_request_id"),
            message="Payment successful.",
        )

    db.session.commit()
    notification_service.notify_appointment_requested(appointment, user, doctor)
    return appointment


def update_appointment_status(
    *,
    actor: User,
    appointment_id: int,
    status: str,
) -> Appointment:
    appointment = db.session.get(Appointment, appointment_id)
    if not appointment:
        raise LookupError("Appointment not found.")

    next_status = (status or "").strip().lower()
    if next_status not in {"confirmed", "declined"}:
        raise ValueError("Status must be confirmed or declined.")
    if appointment.status != "pending":
        raise ValueError("This appointment has already been responded to.")
    if appointment.doctor_user_id != actor.id or not actor.is_doctor:
        raise PermissionError("Only the assigned doctor can respond to this request.")

    appointment.status = next_status
    appointment.updated_at = datetime.now(timezone.utc)
    db.session.commit()

    owner = db.session.get(User, appointment.user_id)
    if owner:
        notification_service.notify_appointment_status(
            appointment, doctor=actor, user=owner
        )
    return appointment
