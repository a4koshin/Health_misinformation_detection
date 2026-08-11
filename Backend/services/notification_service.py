"""In-app notifications for advisor review, user corrections, and admin tracking."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import func

from extensions import db
from models.notification import Notification
from models.prediction import Prediction
from models.user import User


def _naive_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is not None:
        return value.astimezone(timezone.utc).replace(tzinfo=None)
    return value


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


def _eligible_advisors(prediction: Prediction) -> list[User]:
    created = _naive_utc(prediction.created_at) or datetime.now(timezone.utc).replace(
        tzinfo=None
    )
    advisors = []
    for advisor in _active_users_with_role("healthcare_advisor"):
        since = _naive_utc(advisor.advisor_since or advisor.created_at)
        if since is not None and created < since:
            continue
        advisors.append(advisor)
    return advisors


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
) -> None:
    if _already_sent(
        recipient_id=recipient.id, type=type, prediction_id=prediction_id
    ):
        return
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
    advisor_body = (
        f"{owner_name} submitted a Non-Reliable claim that needs your review."
    )
    admin_body = (
        f"{owner_name} submitted a Non-Reliable claim. Advisors can now review it."
    )

    for advisor in _eligible_advisors(prediction):
        _add_notification(
            recipient=advisor,
            audience="advisor",
            type="review_queued",
            title=title,
            body=advisor_body,
            prediction_id=prediction.id,
            actor=owner,
            other_user=None,
            claim_excerpt=excerpt,
            corrected_excerpt=None,
            href="/review",
        )

    for admin in _active_users_with_role("admin"):
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
            href="/audit-log",
        )

    from services import audit_service

    audit_service.log_action(
        actor_id=owner.id if owner else None,
        actor_email=owner.email if owner else None,
        action="review.queued",
        entity_type="prediction",
        entity_id=prediction.id,
        details=f"Non-Reliable claim sent to advisors: {excerpt or ''}".strip(),
        commit=False,
    )

    db.session.commit()


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
    advisor_body = (
        f"{owner_name} uploaded {count} Non-Reliable claims that need review."
    )
    admin_body = (
        f"{owner_name} uploaded {count} Non-Reliable claims. Advisors can now review them."
    )
    first_id = queued[0].id
    excerpt = _excerpt(queued[0].claim_text)

    for advisor in _eligible_advisors(queued[0]):
        _add_notification(
            recipient=advisor,
            audience="advisor",
            type="review_queued",
            title=title,
            body=advisor_body,
            prediction_id=first_id,
            actor=owner,
            other_user=None,
            claim_excerpt=excerpt,
            corrected_excerpt=None,
            href="/review",
        )

    for admin in _active_users_with_role("admin"):
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
            href="/audit-log",
        )

    from services import audit_service

    audit_service.log_action(
        actor_id=owner.id if owner else None,
        actor_email=owner.email if owner else None,
        action="review.queued",
        entity_type="prediction",
        entity_id=first_id,
        details=f"{owner_name} uploaded {count} Non-Reliable claims for advisor review.",
        commit=False,
    )

    db.session.commit()


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

    for admin in _active_users_with_role("admin"):
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
