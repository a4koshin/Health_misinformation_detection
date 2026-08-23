"""In-app notifications for advisor review, user corrections, and admin tracking."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import func

from extensions import db
from models.notification import Notification
from models.prediction import Prediction
from models.user import User


def _excerpt(text: str | None, limit: int = 140) -> str | None:
    value = " ".join((text or "").split())
    if not value:
        return None
    if len(value) <= limit:
        return value
    return value[: limit - 1] + "…"


def _display_name(user: User | None) -> str:
    if not user:
        return "Someone"
    return (user.full_name or "").strip() or user.email.split("@")[0]


def _active_users_with_role(role: str) -> list[User]:
    return (
        User.query.filter(
            func.lower(User.role) == role,
            User.is_active.is_(True),
        ).all()
    )


def _already_sent(*, recipient_id: int, type: str, prediction_id: int | None) -> bool:
    if prediction_id is None:
        return False
    return (
        Notification.query.filter_by(
            recipient_id=recipient_id,
            type=type,
            prediction_id=prediction_id,
        ).first()
        is not None
    )


def _add_notification(
    *,
    recipient: User,
    audience: str,
    type: str,
    title: str,
    body: str,
    prediction_id: int | None,
    actor: User | None,
    other_user: User | None,
    claim_excerpt: str | None,
    corrected_excerpt: str | None,
    href: str,
) -> int | None:
    if _already_sent(
        recipient_id=recipient.id, type=type, prediction_id=prediction_id
    ):
        return None
    db.session.add(
        Notification(
            recipient_id=recipient.id,
            audience=audience,
            type=type,
            title=title,
            body=body,
            prediction_id=prediction_id,
            actor_id=actor.id if actor else None,
            actor_role=(actor.role if actor else None),
            actor_name=_display_name(actor) if actor else None,
            other_user_id=other_user.id if other_user else None,
            other_user_name=_display_name(other_user) if other_user else None,
            claim_excerpt=claim_excerpt,
            corrected_excerpt=corrected_excerpt,
            href=href,
        )
    )
    return int(recipient.id)


def _fanout(recipient_ids: list[int | None] | set[int | None]) -> None:
    ids = {int(rid) for rid in recipient_ids if rid is not None}
    if not ids:
        return
    from services.notification_hub import publish_many

    publish_many(ids, {"type": "refresh"})


def notify_non_reliable_claim(prediction: Prediction) -> None:
    try:
        _notify_non_reliable_claim(prediction)
    except Exception:
        db.session.rollback()


def _notify_non_reliable_claim(prediction: Prediction) -> None:
    if not prediction or not prediction.needs_review:
        return
    if (prediction.label or "") not in {"Non-Reliable", "Misinformation"}:
        return

    owner = db.session.get(User, prediction.user_id)
    excerpt = _excerpt(prediction.claim_text)
    owner_name = _display_name(owner)
    title = "New Non-Reliable claim"
    admin_body = (
        f"{owner_name} submitted a Non-Reliable claim. "
        "Assign a doctor to review it."
    )

    recipient_ids: list[int | None] = []
    for admin in _active_users_with_role("admin"):
        recipient_ids.append(
            _add_notification(
                recipient=admin,
                audience="admin",
                type="review_queued",
                title=title,
                body=admin_body,
                prediction_id=prediction.id,
                actor=owner,
                other_user=None,
                claim_excerpt=excerpt,
                corrected_excerpt=None,
                href="/assign-reviews",
            )
        )

    from services import audit_service

    audit_service.log_action(
        actor_id=owner.id if owner else None,
        actor_email=owner.email if owner else None,
        action="review.queued",
        entity_type="prediction",
        entity_id=prediction.id,
        details=f"Non-Reliable claim waiting for admin assignment: {excerpt or ''}".strip(),
        commit=False,
    )

    db.session.commit()
    _fanout(recipient_ids)


def notify_non_reliable_batch(predictions: list[Prediction], *, user_id: int) -> None:
    try:
        _notify_non_reliable_batch(predictions, user_id=user_id)
    except Exception:
        db.session.rollback()


def _notify_non_reliable_batch(predictions: list[Prediction], *, user_id: int) -> None:
    queued = [
        row
        for row in predictions
        if row.needs_review
        and (row.label or "") in {"Non-Reliable", "Misinformation"}
    ]
    if not queued:
        return
    if len(queued) == 1:
        notify_non_reliable_claim(queued[0])
        return

    owner = db.session.get(User, user_id)
    owner_name = _display_name(owner)
    count = len(queued)
    title = "New Non-Reliable claims"
    admin_body = (
        f"{owner_name} uploaded {count} Non-Reliable claims. "
        "Assign doctors to review them."
    )
    first_id = queued[0].id
    excerpt = _excerpt(queued[0].claim_text)

    recipient_ids: list[int | None] = []
    for admin in _active_users_with_role("admin"):
        recipient_ids.append(
            _add_notification(
                recipient=admin,
                audience="admin",
                type="review_queued",
                title=title,
                body=admin_body,
                prediction_id=first_id,
                actor=owner,
                other_user=None,
                claim_excerpt=excerpt,
                corrected_excerpt=None,
                href="/assign-reviews",
            )
        )

    from services import audit_service

    audit_service.log_action(
        actor_id=owner.id if owner else None,
        actor_email=owner.email if owner else None,
        action="review.queued",
        entity_type="prediction",
        entity_id=first_id,
        details=(
            f"{owner_name} uploaded {count} Non-Reliable claims "
            "waiting for admin assignment."
        ),
        commit=False,
    )

    db.session.commit()
    _fanout(recipient_ids)


def notify_review_assigned(
    prediction: Prediction,
    *,
    doctor: User,
    admin: User,
) -> None:
    try:
        _notify_review_assigned(prediction, doctor=doctor, admin=admin)
    except Exception:
        db.session.rollback()


def _notify_review_assigned(
    prediction: Prediction,
    *,
    doctor: User,
    admin: User,
) -> None:
    if not prediction or not doctor:
        return

    # Allow reassignment to notify the newly chosen doctor.
    Notification.query.filter_by(
        type="review_assigned",
        prediction_id=prediction.id,
    ).delete(synchronize_session=False)

    owner = db.session.get(User, prediction.user_id)
    excerpt = _excerpt(prediction.claim_text)
    admin_name = _display_name(admin)
    owner_name = _display_name(owner)
    title = "Claim assigned to you"

    recipient_id = _add_notification(
        recipient=doctor,
        audience="advisor",
        type="review_assigned",
        title=title,
        body=(
            f"{admin_name} assigned you a Non-Reliable claim from {owner_name} "
            "to review."
            + (f' Claim: "{excerpt}"' if excerpt else "")
        ),
        prediction_id=prediction.id,
        actor=admin,
        other_user=owner,
        claim_excerpt=excerpt,
        corrected_excerpt=None,
        href="/review",
    )

    from services import audit_service

    audit_service.log_action(
        actor_id=admin.id,
        actor_email=admin.email,
        action="review.assigned",
        entity_type="prediction",
        entity_id=prediction.id,
        details=(
            f"Assigned claim to {_display_name(doctor)} "
            f"({doctor.email}): {excerpt or ''}"
        ).strip(),
        commit=False,
    )
    db.session.commit()
    _fanout([recipient_id])


def notify_claim_corrected(prediction: Prediction, advisor: User) -> None:
    try:
        _notify_claim_corrected(prediction, advisor)
    except Exception:
        db.session.rollback()


def _notify_claim_corrected(prediction: Prediction, advisor: User) -> None:
    if not prediction or (prediction.review_status or "") != "corrected":
        return

    owner = db.session.get(User, prediction.user_id)
    if not owner:
        return

    excerpt = _excerpt(prediction.claim_text)
    corrected = _excerpt(prediction.corrected_claim_text)
    advisor_name = _display_name(advisor)
    owner_name = _display_name(owner)
    title = "Claim corrected"

    recipient_ids: list[int | None] = [
        _add_notification(
            recipient=owner,
            audience="user",
            type="claim_corrected",
            title="Your claim was corrected",
            body=(
                f"{advisor_name} corrected your claim. "
                "Open Corrections to read the updated sentence."
            ),
            prediction_id=prediction.id,
            actor=advisor,
            other_user=owner,
            claim_excerpt=excerpt,
            corrected_excerpt=corrected,
            href="/corrections",
        )
    ]

    for admin in _active_users_with_role("admin"):
        recipient_ids.append(
            _add_notification(
                recipient=admin,
                audience="admin",
                type="claim_corrected",
                title=title,
                body=f"{advisor_name} corrected a claim from {owner_name}.",
                prediction_id=prediction.id,
                actor=advisor,
                other_user=owner,
                claim_excerpt=excerpt,
                corrected_excerpt=corrected,
                href="/audit-log",
            )
        )

    from services import audit_service

    audit_service.log_action(
        actor_id=advisor.id,
        actor_email=advisor.email,
        action="review.corrected",
        entity_type="prediction",
        entity_id=prediction.id,
        details=(
            f"{advisor_name} corrected a claim from {owner_name}"
            + (f": {corrected}" if corrected else ".")
        ),
        commit=False,
    )

    db.session.commit()
    _fanout(recipient_ids)


def notify_appointment_requested(
    appointment, user: User, doctor: User
) -> None:
    try:
        _notify_appointment_requested(appointment, user, doctor)
    except Exception:
        db.session.rollback()


def _notify_appointment_requested(appointment, user: User, doctor: User) -> None:
    from models.prediction import Prediction

    prediction = db.session.get(Prediction, appointment.prediction_id)
    excerpt = _excerpt(
        (prediction.corrected_claim_text if prediction else None)
        or (prediction.claim_text if prediction else None)
    )
    user_name = _display_name(user)
    Notification.query.filter_by(
        recipient_id=doctor.id,
        type="appointment_requested",
        prediction_id=appointment.prediction_id,
    ).delete(synchronize_session=False)
    recipient_id = _add_notification(
        recipient=doctor,
        audience="advisor",
        type="appointment_requested",
        title="Appointment request",
        body=(
            f"{user_name} booked {appointment.starts_at.strftime('%Y-%m-%d %H:%M') if appointment.starts_at else 'a time'} "
            "to ask more about a claim you corrected."
        ),
        prediction_id=appointment.prediction_id,
        actor=user,
        other_user=doctor,
        claim_excerpt=excerpt,
        corrected_excerpt=_excerpt(appointment.note),
        href="/appointments",
    )
    db.session.commit()
    _fanout([recipient_id])


def notify_appointment_status(appointment, *, doctor: User, user: User) -> None:
    try:
        _notify_appointment_status(appointment, doctor=doctor, user=user)
    except Exception:
        db.session.rollback()


def _notify_appointment_status(appointment, *, doctor: User, user: User) -> None:
    doctor_name = _display_name(doctor)
    confirmed = appointment.status == "confirmed"
    notify_type = "appointment_confirmed" if confirmed else "appointment_declined"
    Notification.query.filter(
        Notification.recipient_id == user.id,
        Notification.prediction_id == appointment.prediction_id,
        Notification.type.in_(("appointment_confirmed", "appointment_declined")),
    ).delete(synchronize_session=False)
    recipient_id = _add_notification(
        recipient=user,
        audience="user",
        type=notify_type,
        title="Appointment confirmed" if confirmed else "Appointment declined",
        body=(
            (
                f"{doctor_name} confirmed your appointment"
                + (
                    f" on {appointment.starts_at.strftime('%Y-%m-%d %H:%M')}"
                    if appointment.starts_at
                    else ""
                )
                + "."
            )
            if confirmed
            else f"{doctor_name} cannot take this appointment right now."
        ),
        prediction_id=appointment.prediction_id,
        actor=doctor,
        other_user=user,
        claim_excerpt=None,
        corrected_excerpt=None,
        href="/corrections",
    )
    db.session.commit()
    _fanout([recipient_id])


def list_notifications(user_id: int, *, limit: int = 40) -> list[dict]:
    limit = min(max(int(limit or 40), 1), 100)
    rows = (
        Notification.query.filter_by(recipient_id=user_id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
        .all()
    )
    return [row.to_dict() for row in rows]


def unread_count(user_id: int) -> int:
    return int(
        Notification.query.filter_by(recipient_id=user_id, read_at=None).count()
        or 0
    )


def mark_read(user_id: int, notification_id: int) -> Notification:
    row = Notification.query.filter_by(
        id=notification_id, recipient_id=user_id
    ).first()
    if not row:
        raise LookupError("Notification not found.")
    if row.read_at is None:
        row.read_at = datetime.now(timezone.utc)
        db.session.commit()
    return row


def mark_all_read(user_id: int) -> int:
    now = datetime.now(timezone.utc)
    updated = (
        Notification.query.filter_by(recipient_id=user_id, read_at=None)
        .update({"read_at": now}, synchronize_session=False)
    )
    db.session.commit()
    return int(updated or 0)
