"""Shared helpers for removing a user and all dependent rows."""

from sqlalchemy import text

from extensions import db
from models.prediction import Prediction


def purge_user_dependencies(user_id: int) -> None:
    """Delete/null every row that still references this user."""
    Prediction.query.filter_by(user_id=user_id).delete(synchronize_session=False)

    # Tables without ORM models in this app, but with FKs to users.
    db.session.execute(
        text("DELETE FROM upload_batches WHERE user_id = :uid"),
        {"uid": user_id},
    )
    db.session.execute(
        text("DELETE FROM password_resets WHERE user_id = :uid"),
        {"uid": user_id},
    )
    # Keep audit history; just detach the actor FK.
    db.session.execute(
        text("UPDATE audit_logs SET actor_id = NULL WHERE actor_id = :uid"),
        {"uid": user_id},
    )
