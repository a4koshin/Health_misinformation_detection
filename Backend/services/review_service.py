"""Healthcare Advisor review queue for Non-Reliable claims."""

from __future__ import annotations

from datetime import datetime, timezone

from extensions import db
from models.prediction import Prediction


def get_pending_reviews(page: int = 1, per_page: int = 20) -> dict:
    page = max(int(page or 1), 1)
    per_page = min(max(int(per_page or 20), 1), 100)

    pagination = (
        Prediction.query.filter_by(review_status="pending")
        .order_by(Prediction.created_at.asc())
        .paginate(page=page, per_page=per_page, error_out=False)
    )

    return {
        "items": [item.to_review_dict() for item in pagination.items],
        "page": pagination.page,
        "per_page": pagination.per_page,
        "total": pagination.total,
        "pages": pagination.pages,
    }


def submit_review(
    prediction_id: int,
    advisor_id: int,
    decision: str,
    note: str | None = None,
) -> Prediction:
    try:
        pred_id = int(prediction_id)
    except (TypeError, ValueError) as exc:
        raise LookupError("Prediction not found.") from exc

    prediction = db.session.get(Prediction, pred_id)
    if not prediction:
        raise LookupError("Prediction not found.")

    if not prediction.needs_review or prediction.review_status != "pending":
        raise ValueError("This claim is not awaiting review.")

    choice = (decision or "").strip().lower()
    if choice not in {"confirmed", "corrected"}:
        raise ValueError("Decision must be 'confirmed' or 'corrected'.")

    prediction.review_status = choice
    prediction.advisor_id = advisor_id
    prediction.advisor_note = (note or "").strip() or None
    prediction.reviewed_at = datetime.now(timezone.utc)

    if choice == "corrected":
        prediction.label = "Reliable"
        prediction.risk = "low"

    db.session.commit()
    return prediction
