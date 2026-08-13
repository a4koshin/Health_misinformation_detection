"""Doctor review queue and admin assignment for Non-Reliable claims."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import case

from extensions import db
from models.prediction import Prediction
from models.user import User


def _naive_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is not None:
        return value.astimezone(timezone.utc).replace(tzinfo=None)
    return value


def advisor_queue_start(advisor: User) -> datetime | None:
    """Doctors only see Non-Reliable claims created after they joined."""
    return _naive_utc(advisor.advisor_since or advisor.created_at)


def get_pending_reviews(
    advisor: User,
    page: int = 1,
    per_page: int = 20,
) -> dict:
    """Doctor queue: only claims assigned to this doctor."""
    page = max(int(page or 1), 1)
    per_page = min(max(int(per_page or 20), 1), 100)

    query = Prediction.query.filter(
        Prediction.advisor_id == advisor.id,
        Prediction.is_active.is_(True),
        Prediction.review_status.in_(("pending", "corrected", "confirmed")),
    )
    since = advisor_queue_start(advisor)
    if since is not None:
        query = query.filter(Prediction.created_at >= since)

    pending_count = query.filter(Prediction.review_status == "pending").count()
    pagination = query.order_by(
        case((Prediction.review_status == "pending", 0), else_=1),
        Prediction.created_at.asc(),
    ).paginate(page=page, per_page=per_page, error_out=False)

    return {
        "items": Prediction.serialize_many(pagination.items, review=True),
        "page": pagination.page,
        "per_page": pagination.per_page,
        "total": pagination.total,
        "pages": pagination.pages,
        "pending_count": int(pending_count or 0),
    }


def get_admin_assignment_queue(
    *,
    status: str = "awaiting_assignment",
    page: int = 1,
    per_page: int = 50,
) -> dict:
    """Admin queue for unassigned or assigned-but-pending claims."""
    page = max(int(page or 1), 1)
    per_page = min(max(int(per_page or 50), 1), 100)
    status_value = (status or "awaiting_assignment").strip().lower()

    query = Prediction.query.filter(Prediction.needs_review.is_(True), Prediction.is_active.is_(True))
    if status_value == "pending":
        query = query.filter(Prediction.review_status == "pending")
    elif status_value == "all":
        query = query.filter(
            Prediction.review_status.in_(("awaiting_assignment", "pending"))
        )
    else:
        query = query.filter(Prediction.review_status == "awaiting_assignment")

    awaiting_count = Prediction.query.filter(
        Prediction.needs_review.is_(True),
        Prediction.is_active.is_(True),
        Prediction.review_status == "awaiting_assignment",
    ).count()
    assigned_pending_count = Prediction.query.filter(
        Prediction.needs_review.is_(True),
        Prediction.is_active.is_(True),
        Prediction.review_status == "pending",
    ).count()

    pagination = query.order_by(Prediction.created_at.asc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return {
        "items": Prediction.serialize_many(pagination.items, review=True),
        "page": pagination.page,
        "per_page": pagination.per_page,
        "total": pagination.total,
        "pages": pagination.pages,
        "awaiting_count": int(awaiting_count or 0),
        "assigned_pending_count": int(assigned_pending_count or 0),
    }


def assign_review(
    *,
    prediction_id: int,
    doctor_user_id: int,
    admin: User,
) -> Prediction:
    try:
        pred_id = int(prediction_id)
        doctor_id = int(doctor_user_id)
    except (TypeError, ValueError) as exc:
        raise ValueError("Invalid prediction or doctor id.") from exc

    prediction = (
        db.session.query(Prediction)
        .filter_by(id=pred_id)
        .with_for_update()
        .first()
    )
    if not prediction:
        raise LookupError("Prediction not found.")

    if not prediction.needs_review:
        raise ValueError("This claim is not waiting for review.")

    status = (prediction.review_status or "").strip().lower()
    if status not in {"awaiting_assignment", "pending"}:
        raise ValueError("This claim can no longer be assigned.")

    doctor = db.session.get(User, doctor_id)
    if not doctor or not doctor.is_doctor or not doctor.is_active:
        raise ValueError("Choose an active doctor account.")

    prediction.advisor_id = doctor.id
    prediction.review_status = "pending"
    prediction.assigned_by_id = admin.id
    prediction.assigned_at = datetime.now(timezone.utc)
    prediction.needs_review = True

    db.session.commit()

    from services import notification_service

    notification_service.notify_review_assigned(prediction, doctor=doctor, admin=admin)
    return prediction


def submit_review(
    prediction_id: int,
    advisor_id: int,
    decision: str,
    note: str | None = None,
    corrected_claim: str | None = None,
) -> Prediction:
    try:
        pred_id = int(prediction_id)
    except (TypeError, ValueError) as exc:
        raise LookupError("Prediction not found.") from exc

    prediction = (
        db.session.query(Prediction)
        .filter_by(id=pred_id)
        .with_for_update()
        .first()
    )
    if not prediction:
        raise LookupError("Prediction not found.")

    if prediction.advisor_id != advisor_id:
        raise ValueError("This claim was not assigned to you.")

    if not prediction.needs_review or prediction.review_status != "pending":
        reviewer = (
            db.session.get(User, prediction.advisor_id)
            if prediction.advisor_id
            else None
        )
        reviewer_name = (
            ((reviewer.full_name or "").strip() or reviewer.email.split("@")[0])
            if reviewer
            else "another doctor"
        )
        raise ValueError(
            f"This claim was already reviewed by {reviewer_name}."
        )

    advisor = db.session.get(User, advisor_id)
    since = advisor_queue_start(advisor) if advisor else None
    claim_created = _naive_utc(prediction.created_at)
    if since is not None and claim_created is not None and claim_created < since:
        raise ValueError(
            "This claim was submitted before you joined as a Doctor."
        )

    choice = (decision or "").strip().lower()
    if choice not in {"confirmed", "corrected"}:
        raise ValueError("Decision must be 'confirmed' or 'corrected'.")

    prediction.review_status = choice
    prediction.advisor_id = advisor_id
    prediction.advisor_note = (note or "").strip() or None
    prediction.reviewed_at = datetime.now(timezone.utc)
    prediction.needs_review = False

    if choice == "corrected":
        rewritten = (corrected_claim or note or "").strip()
        if not rewritten:
            raise ValueError("A corrected sentence is required.")
        if rewritten == (prediction.claim_text or "").strip():
            raise ValueError("Corrected sentence must differ from the original claim.")
        prediction.label = "Reliable"
        prediction.risk = "low"
        prediction.corrected_claim_text = rewritten
        if not prediction.advisor_note:
            prediction.advisor_note = rewritten
    else:
        prediction.corrected_claim_text = None

    db.session.commit()
    if choice == "corrected" and advisor:
        from services import notification_service

        notification_service.notify_claim_corrected(prediction, advisor)
    return prediction
