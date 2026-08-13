"""Shared helpers for removing a user and all dependent rows."""

from sqlalchemy import text

from extensions import db
from models.prediction import Prediction


def _safe_execute(sql: str, user_id: int) -> None:
    try:
        with db.session.begin_nested():
            db.session.execute(text(sql), {"uid": user_id})
    except Exception:
        return


def purge_user_dependencies(user_id: int) -> None:
    """Delete/null every row that still references this user."""
    Prediction.query.filter_by(advisor_id=user_id).update(
        {Prediction.advisor_id: None},
        synchronize_session=False,
    )
    Prediction.query.filter_by(user_id=user_id).delete(synchronize_session=False)

    _safe_execute("DELETE FROM doctors WHERE user_id = :uid", user_id)
    _safe_execute("DELETE FROM upload_batches WHERE user_id = :uid", user_id)
    _safe_execute("DELETE FROM password_resets WHERE user_id = :uid", user_id)
    _safe_execute("DELETE FROM conversations WHERE user_id = :uid", user_id)
    _safe_execute(
        "DELETE FROM notifications WHERE recipient_id = :uid OR actor_id = :uid OR other_user_id = :uid",
        user_id,
    )
    _safe_execute("UPDATE audit_logs SET actor_id = NULL WHERE actor_id = :uid", user_id)
