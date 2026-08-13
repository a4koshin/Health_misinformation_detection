from sqlalchemy import func, or_
from sqlalchemy.orm import aliased

from models.prediction import Prediction
from models.user import User
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
        review_status="awaiting_assignment" if needs_review else None,
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
    is_admin: bool = False,
) -> dict:
    """
    Role-scoped prediction history:
    - admin: all predictions
    - doctor: own predictions + claims assigned/reviewed by them
    - user: own predictions only
    """
    page = max(page, 1)
    per_page = min(max(per_page, 1), 200)

    if is_admin:
        query = Prediction.query
    elif include_reviewed:
        query = Prediction.query.filter(
            or_(
                Prediction.user_id == user_id,
                Prediction.advisor_id == user_id,
            ),
            Prediction.is_active.is_(True),
        )
    else:
        query = Prediction.query.filter_by(user_id=user_id, is_active=True)

    pagination = query.order_by(Prediction.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return {
        "items": Prediction.serialize_many(pagination.items, review=True),
        "page": pagination.page,
        "per_page": pagination.per_page,
        "total": pagination.total,
        "pages": pagination.pages,
    }


def get_corrections(
    *,
    user_id: int,
    is_admin: bool = False,
    page: int = 1,
    per_page: int = 100,
) -> dict:
    """Corrected claims for a user, or all corrections for admins."""
    page = max(page, 1)
    per_page = min(max(per_page, 1), 200)

    query = Prediction.query.filter(
        or_(
            Prediction.review_status == "corrected",
            Prediction.corrected_claim_text.isnot(None),
        ),
        Prediction.is_active.is_(True),
    )
    if not is_admin:
        query = query.filter(Prediction.user_id == user_id)

    pending_query = Prediction.query.filter(
        Prediction.needs_review.is_(True),
        Prediction.is_active.is_(True),
        Prediction.review_status.in_(("awaiting_assignment", "pending")),
    )
    if not is_admin:
        pending_query = pending_query.filter(Prediction.user_id == user_id)

    pagination = query.order_by(
        Prediction.reviewed_at.desc().nullslast(),
        Prediction.created_at.desc(),
    ).paginate(page=page, per_page=per_page, error_out=False)

    return {
        "items": Prediction.serialize_many(pagination.items, review=True),
        "page": pagination.page,
        "per_page": pagination.per_page,
        "total": pagination.total,
        "pages": pagination.pages,
        "pending_count": int(pending_query.count() or 0),
    }


def delete_prediction(
    user_id: int,
    prediction_id: int,
) -> bool:
    """Hard-delete is only for the owning user — admins deactivate instead."""
    prediction = Prediction.query.filter_by(
        id=prediction_id, user_id=user_id
    ).first()
    if not prediction:
        return False
    db.session.delete(prediction)
    db.session.commit()
    return True


def set_prediction_active(
    *,
    prediction_id: int,
    is_active: bool,
) -> Prediction | None:
    prediction = db.session.get(Prediction, prediction_id)
    if not prediction:
        return None
    prediction.is_active = bool(is_active)
    db.session.commit()
    return prediction


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


def get_platform_report(
    user_id: int | None = None,
    *,
    is_admin: bool = False,
    role: str | None = None,
    doctor_id: str | int | None = None,
) -> dict:
    """Admin sees all users; regular users see only their own predictions."""
    query = Prediction.query
    if not is_admin:
        query = query.filter_by(user_id=user_id)

    resolved_role = (role or "").strip().lower()
    if resolved_role in {"doctor", "healthcare_advisor"}:
        advisor_user = aliased(User)
        query = query.join(
            advisor_user, Prediction.advisor_id == advisor_user.id
        ).filter(
            func.lower(advisor_user.role).in_(("doctor", "healthcare_advisor"))
        )
    elif resolved_role in {"user", "admin"}:
        query = query.join(User, User.id == Prediction.user_id).filter(
            func.lower(User.role) == resolved_role
        )

    try:
        advisor_pk = int(doctor_id) if doctor_id not in (None, "", "all") else None
    except (TypeError, ValueError):
        advisor_pk = None
    if advisor_pk is not None:
        query = query.filter(Prediction.advisor_id == advisor_pk)

    rows = [
        row
        for row in query.order_by(Prediction.created_at.desc()).all()
        if (row.source or "") != "non_medical" and row.label
    ]
    return _build_report_payload(
        rows,
        scope_user_id=None if is_admin else user_id,
        role=resolved_role,
    )


def _build_report_payload(
    rows: list[Prediction],
    scope_user_id: int | None,
    *,
    role: str | None = None,
) -> dict:

    total_claims = len(rows)
    reliable_rows = [row for row in rows if row.label == "Reliable"]
    non_reliable_rows = [
        row for row in rows if row.label in {"Non-Reliable", "Misinformation"}
    ]
    reliable_count = len(reliable_rows)
    non_reliable_count = len(non_reliable_rows)

    user_ids = {row.user_id for row in rows}
    advisor_ids = {row.advisor_id for row in rows if row.advisor_id}
    users_with_predictions = len(user_ids)

    related_ids = user_ids | advisor_ids
    users_by_id = {
        user.id: user
        for user in User.query.filter(User.id.in_(related_ids)).all()
    } if related_ids else {}

    doctors = (
        User.query.filter(
            func.lower(User.role).in_(("doctor", "healthcare_advisor")),
            User.is_active.is_(True),
        )
        .order_by(User.full_name.asc(), User.email.asc())
        .all()
    )
    doctor_corrections: dict[int, int] = {}
    for row in rows:
        if (row.review_status or "") == "corrected" and row.advisor_id:
            doctor_corrections[row.advisor_id] = doctor_corrections.get(row.advisor_id, 0) + 1

    report_rows = []
    for row in rows:
        user = users_by_id.get(row.user_id)
        advisor = users_by_id.get(row.advisor_id) if row.advisor_id else None
        label = row.label
        if label == "Misinformation":
            label = "Non-Reliable"
        advisor_name = (
            (
                (advisor.full_name or "").strip()
                or advisor.email.split("@")[0]
            )
            if advisor
            else None
        )
        advisor_email = advisor.email if advisor else None
        submitter_name = (user.full_name if user and user.full_name else None) or (
            user.email.split("@")[0] if user else "Unknown"
        )
        submitter_role = (user.role if user else "user") or "user"
        advisor_view = (role or "").strip().lower() in {
            "doctor",
            "healthcare_advisor",
        }
        report_rows.append(
            {
                "id": str(row.id),
                "user_id": (
                    str(row.advisor_id)
                    if advisor_view and row.advisor_id
                    else str(row.user_id)
                ),
                "user_name": (
                    advisor_name or "Doctor"
                    if advisor_view
                    else submitter_name
                ),
                "user_email": (
                    advisor_email or ""
                    if advisor_view
                    else (user.email if user else "")
                ),
                "user_role": (
                    "doctor" if advisor_view else submitter_role
                ),
                "claim": row.claim_text,
                "label": label,
                "review_status": row.review_status,
                "advisor_id": str(row.advisor_id) if row.advisor_id else None,
                "advisor_name": advisor_name,
                "advisor_email": advisor_email,
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
        "doctors_who_can_review": len(doctors),
        "doctors": [
            {
                "id": str(doctor.id),
                "name": (doctor.full_name or "").strip() or doctor.email.split("@")[0],
                "email": doctor.email,
                "corrections": doctor_corrections.get(doctor.id, 0),
            }
            for doctor in doctors
        ],
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
