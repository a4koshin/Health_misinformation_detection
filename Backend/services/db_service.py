from sqlalchemy import or_

from models.prediction import Prediction
from extensions import db


def save_prediction(
    user_id: int,
    claim_text: str,
    is_medical: bool,
    label: str | None = None,
    label_confidence: float | None = None,
    cleaned_text: str | None = None,
    source: str | None = None,
    commit: bool = True,
) -> Prediction:
    # Neon NOT NULL: label, confidence, risk, source — non-medical exits omit Task A.
    # Topic/category is retired — DB columns are kept only for schema compatibility.
    resolved_label = label or ("Non-medical" if not is_medical else "Pending")
    resolved_confidence = float(label_confidence) if label_confidence is not None else 0.0
    if resolved_label == "Reliable":
        resolved_risk = "low"
    elif resolved_label in {"Non-Reliable", "Misinformation"}:
        resolved_risk = "high"
    else:
        resolved_risk = "none"
    resolved_source = source or ("pipeline" if is_medical else "non_medical")
    needs_review = resolved_label in {"Non-Reliable", "Misinformation"}

    prediction = Prediction(
        user_id=user_id,
        claim_text=claim_text,
        cleaned_text=cleaned_text,
        label=resolved_label,
        confidence=resolved_confidence,
        label_confidence=label_confidence,
        source=resolved_source,
        risk=resolved_risk,
        needs_review=needs_review,
        review_status="pending" if needs_review else None,
    )
    db.session.add(prediction)
    if commit:
        db.session.commit()
    return prediction


def get_user_predictions(
    user_id: int,
    page: int = 1,
    per_page: int = 20,
    *,
    include_reviewed: bool = False,
) -> dict:
    page = max(page, 1)
    per_page = min(max(per_page, 1), 100)

    query = Prediction.query.filter_by(user_id=user_id)
    if include_reviewed:
        query = Prediction.query.filter(
            or_(
                Prediction.user_id == user_id,
                Prediction.advisor_id == user_id,
            )
        )

    pagination = query.order_by(Prediction.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return {
        "items": Prediction.serialize_many(pagination.items),
        "page": pagination.page,
        "per_page": pagination.per_page,
        "total": pagination.total,
        "pages": pagination.pages,
    }


def delete_prediction(user_id: int, prediction_id: int) -> bool:
    prediction = Prediction.query.filter_by(id=prediction_id, user_id=user_id).first()
    if not prediction:
        return False
    db.session.delete(prediction)
    db.session.commit()
    return True


def get_user_dashboard_stats(user_id: int) -> dict:
    rows = Prediction.query.filter_by(user_id=user_id).all()
    medical = [
        row
        for row in rows
        if (row.source or "") != "non_medical" and row.label
    ]
    reliable = sum(1 for row in medical if row.label == "Reliable")
    non_reliable = sum(
        1
        for row in medical
        if row.label in {"Non-Reliable", "Misinformation"}
    )
    return {
        "total_predictions": len(medical),
        "reliable_count": reliable,
        "non_reliable_count": non_reliable,
        "chat_count": len(rows),
    }


def get_user_report_stats(user_id: int) -> dict:
    rows = [
        row
        for row in Prediction.query.filter_by(user_id=user_id).all()
        if (row.source or "") != "non_medical" and row.label
    ]
    return _build_report_payload(rows, scope_user_id=user_id)


def get_platform_report(user_id: int | None = None, *, is_admin: bool = False) -> dict:
    """Admin sees all users; regular users see only their own predictions."""
    query = Prediction.query
    if not is_admin:
        query = query.filter_by(user_id=user_id)

    rows = [
        row
        for row in query.order_by(Prediction.created_at.desc()).all()
        if (row.source or "") != "non_medical" and row.label
    ]
    return _build_report_payload(rows, scope_user_id=None if is_admin else user_id)


def _build_report_payload(rows: list[Prediction], scope_user_id: int | None) -> dict:
    from models.user import User

    total_claims = len(rows)
    reliable_rows = [row for row in rows if row.label == "Reliable"]
    non_reliable_rows = [
        row for row in rows if row.label in {"Non-Reliable", "Misinformation"}
    ]
    reliable_count = len(reliable_rows)
    non_reliable_count = len(non_reliable_rows)

    user_ids = {row.user_id for row in rows}
    users_with_predictions = len(user_ids)

    users_by_id = {
        user.id: user
        for user in User.query.filter(User.id.in_(user_ids)).all()
    } if user_ids else {}

    report_rows = []
    for row in rows:
        user = users_by_id.get(row.user_id)
        label = row.label
        if label == "Misinformation":
            label = "Non-Reliable"
        report_rows.append(
            {
                "id": str(row.id),
                "user_id": str(row.user_id),
                "user_name": (user.full_name if user and user.full_name else None)
                or (user.email.split("@")[0] if user else "Unknown"),
                "user_email": user.email if user else "",
                "claim": row.claim_text,
                "label": label,
                "source": (
                    "UploadedFile"
                    if (row.source or "") == "UploadedFile" or row.upload_batch_id
                    else "Manual check"
                ),
                "created_at": row.created_at.isoformat() if row.created_at else None,
            }
        )

    return {
        "total_claims": total_claims,
        "total_rows": total_claims,
        "users_with_predictions": users_with_predictions,
        "reliable_count": reliable_count,
        "non_reliable_count": non_reliable_count,
        "reliable_percent": round((reliable_count / total_claims) * 100, 1)
        if total_claims
        else 0.0,
        "non_reliable_percent": round((non_reliable_count / total_claims) * 100, 1)
        if total_claims
        else 0.0,
        "rows": report_rows,
    }


def build_report_csv(report: dict) -> str:
    import csv
    import io

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        ["user_name", "user_email", "claim", "label", "source", "created_at"]
    )
    for row in report.get("rows", []):
        writer.writerow(
            [
                row.get("user_name", ""),
                row.get("user_email", ""),
                row.get("claim", ""),
                row.get("label", ""),
                row.get("source") or "Manual check",
                row.get("created_at") or "",
            ]
        )
    return buffer.getvalue()
