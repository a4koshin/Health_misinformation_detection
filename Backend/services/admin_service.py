from datetime import datetime, timedelta, timezone
from collections import defaultdict

from flask_jwt_extended import get_jwt_identity
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError

from extensions import db
from models.prediction import Prediction
from models.user import User
from services import auth_service
from services.user_cleanup import purge_user_dependencies


def require_admin() -> User:
    user = auth_service.get_user_by_id(get_jwt_identity())
    if not user:
        raise PermissionError("User not found.")
    if (user.role or "").lower() != "admin":
        raise PermissionError("Admin access required.")
    return user


def get_admin_dashboard_stats() -> dict:
    total_users = db.session.query(func.count(User.id)).scalar() or 0
    total_admins = (
        db.session.query(func.count(User.id))
        .filter(func.lower(User.role) == "admin")
        .scalar()
        or 0
    )
    total_advisors = (
        db.session.query(func.count(User.id))
        .filter(func.lower(User.role) == "healthcare_advisor")
        .scalar()
        or 0
    )
    total_regular_users = max(total_users - total_admins - total_advisors, 0)

    predictions = Prediction.query.filter(Prediction.label.isnot(None)).all()
    predictions = [
        row for row in predictions if (row.source or "") != "non_medical"
    ]

    total_predictions = len(predictions)
    reliable_count = sum(1 for row in predictions if row.label == "Reliable")
    non_reliable_count = sum(
        1
        for row in predictions
        if row.label in {"Non-Reliable", "Misinformation"}
    )
    pending_count = (
        db.session.query(func.count(Prediction.id))
        .filter(Prediction.label.is_(None))
        .scalar()
        or 0
    )

    review_pending = sum(
        1 for row in predictions if (row.review_status or "") == "pending"
    )
    review_confirmed = sum(
        1 for row in predictions if (row.review_status or "") == "confirmed"
    )
    review_corrected = sum(
        1 for row in predictions if (row.review_status or "") == "corrected"
    )
    review_unreviewed = max(
        total_predictions - review_pending - review_confirmed - review_corrected,
        0,
    )

    source_counts: dict[str, int] = defaultdict(int)
    for row in predictions:
        stored = (row.source or "").strip()
        if stored == "UploadedFile" or row.upload_batch_id:
            key = "UploadedFile"
        elif stored in {"Manual check", "File upload"}:
            key = "Manual check"
        else:
            key = "Manual check"
        source_counts[key] += 1

    sources = [
        {"name": name, "count": count}
        for name, count in sorted(source_counts.items(), key=lambda item: (-item[1], item[0]))
    ]

    roles = [
        {"name": "User", "count": total_regular_users, "key": "user"},
        {"name": "Healthcare Advisor", "count": total_advisors, "key": "healthcare_advisor"},
        {"name": "Admin", "count": total_admins, "key": "admin"},
    ]

    reviews = [
        {"name": "Pending", "count": review_pending, "key": "pending"},
        {"name": "Confirmed", "count": review_confirmed, "key": "confirmed"},
        {"name": "Corrected", "count": review_corrected, "key": "corrected"},
        {"name": "No review", "count": review_unreviewed, "key": "none"},
    ]

    # Last 14 days daily volume (total + label split)
    today = datetime.now(timezone.utc).date()
    start = today - timedelta(days=13)
    daily_map = {
        start + timedelta(days=i): {"count": 0, "reliable": 0, "non_reliable": 0}
        for i in range(14)
    }
    all_for_dates = Prediction.query.filter(Prediction.created_at.isnot(None)).all()
    for row in all_for_dates:
        created = row.created_at
        if created is None:
            continue
        day = created.date() if hasattr(created, "date") else created
        if day not in daily_map:
            continue
        if (row.source or "") == "non_medical":
            continue
        daily_map[day]["count"] += 1
        if row.label == "Reliable":
            daily_map[day]["reliable"] += 1
        elif row.label in {"Non-Reliable", "Misinformation"}:
            daily_map[day]["non_reliable"] += 1

    daily = [
        {
            "date": day.isoformat(),
            "label": day.strftime("%b %d"),
            "count": values["count"],
            "reliable": values["reliable"],
            "non_reliable": values["non_reliable"],
        }
        for day, values in sorted(daily_map.items())
    ]

    # Predictions per user
    per_user: dict[int, dict] = defaultdict(
        lambda: {"predictions": 0, "reliable": 0, "non_reliable": 0}
    )
    for row in predictions:
        bucket = per_user[row.user_id]
        bucket["predictions"] += 1
        if row.label == "Reliable":
            bucket["reliable"] += 1
        elif row.label in {"Non-Reliable", "Misinformation"}:
            bucket["non_reliable"] += 1

    users = User.query.order_by(User.created_at.desc()).all()
    users_table = []
    active_users = []
    label_mix = []
    for user in users:
        stats = per_user.get(user.id, {"predictions": 0, "reliable": 0, "non_reliable": 0})
        name = user.full_name or user.email.split("@")[0]
        users_table.append(
            {
                "id": str(user.id),
                "full_name": user.full_name,
                "email": user.email,
                "role": user.role or "user",
                "predictions": stats["predictions"],
                "reliable": stats["reliable"],
                "non_reliable": stats["non_reliable"],
                "joined": user.created_at.date().isoformat() if user.created_at else None,
            }
        )
        if stats["predictions"] > 0:
            active_users.append({"name": name, "count": stats["predictions"]})
            label_mix.append(
                {
                    "name": name,
                    "reliable": stats["reliable"],
                    "non_reliable": stats["non_reliable"],
                }
            )

    active_users.sort(key=lambda item: item["count"], reverse=True)
    active_users = active_users[:8]
    label_mix.sort(
        key=lambda item: item["reliable"] + item["non_reliable"], reverse=True
    )
    label_mix = label_mix[:8]

    return {
        "total_users": total_users,
        "total_admins": total_admins,
        "total_advisors": total_advisors,
        "total_regular_users": total_regular_users,
        "total_detections": total_predictions,
        "total_predictions": total_predictions,
        "reliable_count": reliable_count,
        "misinformation_count": non_reliable_count,
        "non_reliable_count": non_reliable_count,
        "pending_count": pending_count,
        "review_pending_count": review_pending,
        "review_confirmed_count": review_confirmed,
        "review_corrected_count": review_corrected,
        "daily": daily,
        "active_users": active_users,
        "label_mix": label_mix,
        "roles": roles,
        "sources": sources,
        "reviews": reviews,
        "users_table": users_table,
    }


def list_users() -> list[dict]:
    users = User.query.order_by(User.created_at.desc()).all()
    return [user.to_dict() for user in users]


def _normalize_role(role: str | None) -> str:
    value = (role or "user").strip().lower()
    if value not in {"user", "admin", "healthcare_advisor"}:
        raise ValueError(
            "Role must be 'user', 'admin', or 'healthcare_advisor'."
        )
    return value


def create_user(
    *,
    email: str,
    password: str,
    full_name: str | None = None,
    role: str | None = "user",
) -> User:
    email = (email or "").strip().lower()
    if not email or not password:
        raise ValueError("Email and password are required.")
    if len(password) < 6:
        raise ValueError("Password must be at least 6 characters.")

    if User.query.filter_by(email=email).first():
        raise ValueError("Email is already registered.")

    user = User(
        email=email,
        full_name=(full_name or "").strip() or None,
        role=_normalize_role(role),
    )
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    return user


def update_user(
    *,
    user_id: int,
    actor_id: int,
    email: str | None = None,
    full_name: str | None = None,
    password: str | None = None,
    role: str | None = None,
    update_full_name: bool = False,
) -> User:
    user = auth_service.get_user_by_id(user_id)
    if not user:
        raise LookupError("User not found.")

    if email is not None:
        next_email = email.strip().lower()
        if not next_email:
            raise ValueError("Email is required.")
        clash = User.query.filter(User.email == next_email, User.id != user.id).first()
        if clash:
            raise ValueError("Email is already registered.")
        user.email = next_email

    if update_full_name:
        user.full_name = (full_name or "").strip() or None

    if password:
        if len(password) < 6:
            raise ValueError("Password must be at least 6 characters.")
        user.set_password(password)

    if role is not None:
        next_role = _normalize_role(role)
        if (
            user.id == actor_id
            and (user.role or "").lower() == "admin"
            and next_role != "admin"
        ):
            raise ValueError("You cannot remove your own admin role.")
        if (user.role or "").lower() == "admin" and next_role != "admin":
            admin_count = (
                db.session.query(func.count(User.id))
                .filter(func.lower(User.role) == "admin")
                .scalar()
                or 0
            )
            if admin_count <= 1:
                raise ValueError("Cannot demote the last admin.")
        user.role = next_role

    db.session.commit()
    return user


def delete_user(*, user_id: int, actor_id: int) -> None:
    user = auth_service.get_user_by_id(user_id)
    if not user:
        raise LookupError("User not found.")
    if user.id == actor_id:
        raise ValueError("You cannot delete your own account.")
    if (user.role or "").lower() == "admin":
        admin_count = (
            db.session.query(func.count(User.id))
            .filter(func.lower(User.role) == "admin")
            .scalar()
            or 0
        )
        if admin_count <= 1:
            raise ValueError("Cannot delete the last admin.")

    purge_user_dependencies(user.id)
    db.session.delete(user)
    try:
        db.session.commit()
    except IntegrityError as exc:
        db.session.rollback()
        raise ValueError(
            "This account is still referenced by other records and cannot be deleted."
        ) from exc
