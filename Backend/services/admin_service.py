from datetime import datetime, timedelta, timezone
from collections import defaultdict

from flask_jwt_extended import get_jwt_identity
from sqlalchemy import func

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

    topic_counts: dict[str, int] = defaultdict(int)
    for row in predictions:
        if row.label == "Reliable" and row.topic:
            # Normalize long topic names for chart labels
            topic_counts[row.topic] += 1

    topics = [
        {"name": _short_topic(name), "full_name": name, "count": count}
        for name, count in sorted(topic_counts.items(), key=lambda item: (-item[1], item[0]))
    ]

    topic_totals: dict[str, int] = defaultdict(int)
    for row in predictions:
        if row.topic:
            topic_totals[row.topic] += 1

    topic_cards = [
        {"name": name, "count": count}
        for name, count in sorted(topic_totals.items(), key=lambda item: (-item[1], item[0]))
    ]
    # Ensure the four common topics appear even at zero.
    known = [
        "Lifestyle Advice",
        "Medication Safety Advice",
        "Medication Advice",
        "Mental Health Advice",
        "Prevention Advice",
        "Preventive Care Advice",
    ]
    present = {card["name"] for card in topic_cards}
    for name in known:
        if name not in present:
            topic_cards.append({"name": name, "count": 0})

    # Last 14 days daily volume
    today = datetime.now(timezone.utc).date()
    start = today - timedelta(days=13)
    daily_map = {start + timedelta(days=i): 0 for i in range(14)}
    all_for_dates = Prediction.query.filter(Prediction.created_at.isnot(None)).all()
    for row in all_for_dates:
        created = row.created_at
        if created is None:
            continue
        day = created.date() if hasattr(created, "date") else created
        if day in daily_map:
            daily_map[day] += 1

    daily = [
        {"date": day.isoformat(), "label": day.strftime("%b %d"), "count": count}
        for day, count in sorted(daily_map.items())
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

    active_users.sort(key=lambda item: item["count"], reverse=True)
    active_users = active_users[:8]

    return {
        "total_users": total_users,
        "total_admins": total_admins,
        "total_detections": total_predictions,
        "total_predictions": total_predictions,
        "reliable_count": reliable_count,
        "misinformation_count": non_reliable_count,
        "non_reliable_count": non_reliable_count,
        "pending_count": pending_count,
        "topics": topics,
        "topic_cards": topic_cards,
        "daily": daily,
        "active_users": active_users,
        "users_table": users_table,
    }


def _short_topic(name: str) -> str:
    mapping = {
        "Lifestyle Advice": "Lifestyle",
        "Medication Advice": "Medication",
        "Medication Safety Advice": "Medication Safety",
        "Mental Health Advice": "Mental Health",
        "Prevention Advice": "Preventive Care",
        "Preventive Care Advice": "Preventive Care",
    }
    return mapping.get(name, name.replace(" Advice", ""))


def list_users() -> list[dict]:
    users = User.query.order_by(User.created_at.desc()).all()
    return [user.to_dict() for user in users]


def _normalize_role(role: str | None) -> str:
    value = (role or "user").strip().lower()
    if value not in {"user", "admin"}:
        raise ValueError("Role must be 'user' or 'admin'.")
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
    db.session.commit()
