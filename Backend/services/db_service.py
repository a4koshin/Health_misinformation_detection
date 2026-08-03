from models.prediction import Prediction
from extensions import db


def save_prediction(
    user_id: int,
    claim_text: str,
    is_medical: bool,
    label: str | None = None,
    label_confidence: float | None = None,
    topic: str | None = None,
    topic_confidence: float | None = None,
    cleaned_text: str | None = None,
    source: str | None = None,
) -> Prediction:
    prediction = Prediction(
        user_id=user_id,
        claim_text=claim_text,
        cleaned_text=cleaned_text,
        label=label,
        confidence=label_confidence,
        label_confidence=label_confidence,
        topic=topic,
        topic_confidence=topic_confidence,
        source=source
        or ("pipeline" if is_medical else "non_medical"),
        risk="low" if label == "Reliable" else ("high" if label else None),
    )
    db.session.add(prediction)
    db.session.commit()
    return prediction


def get_user_predictions(user_id: int, page: int = 1, per_page: int = 20) -> dict:
    page = max(page, 1)
    per_page = min(max(per_page, 1), 100)

    pagination = (
        Prediction.query.filter_by(user_id=user_id)
        .order_by(Prediction.created_at.desc())
        .paginate(page=page, per_page=per_page, error_out=False)
    )

    return {
        "items": [item.to_dict() for item in pagination.items],
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

    topic_counts: dict[str, int] = {}
    for row in reliable_rows:
        if row.topic:
            topic_counts[row.topic] = topic_counts.get(row.topic, 0) + 1

    reliable_topics = []
    for topic, count in sorted(topic_counts.items(), key=lambda item: (-item[1], item[0])):
        share = round((count / reliable_count) * 100, 1) if reliable_count else 0.0
        reliable_topics.append(
            {
                "topic": topic,
                "count": count,
                "share": share,
            }
        )

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
                "topic": row.topic if label == "Reliable" else None,
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
        "reliable_topics": reliable_topics,
        "topic_breakdown": {
            item["topic"]: item["share"] for item in reliable_topics
        },
        "rows": report_rows,
    }


def build_report_csv(report: dict) -> str:
    import csv
    import io

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        ["user_name", "user_email", "claim", "label", "topic", "created_at"]
    )
    for row in report.get("rows", []):
        writer.writerow(
            [
                row.get("user_name", ""),
                row.get("user_email", ""),
                row.get("claim", ""),
                row.get("label", ""),
                row.get("topic") or "",
                row.get("created_at") or "",
            ]
        )
    return buffer.getvalue()

    return {
        "total_checked": total_checked,
        "reliable_count": reliable_count,
        "non_reliable_count": non_reliable_count,
        "reliable_percent": round((reliable_count / total_checked) * 100, 2),
        "non_reliable_percent": round((non_reliable_count / total_checked) * 100, 2),
        "topic_breakdown": topic_breakdown,
    }
