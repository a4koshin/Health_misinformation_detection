from __future__ import annotations

import threading

from flask import current_app, has_app_context

from models.audit_log import AuditLog
from extensions import db


def log_action(
    *,
    actor_id: int | None,
    actor_email: str | None,
    action: str,
    entity_type: str | None = None,
    entity_id: str | int | None = None,
    details: str | None = None,
    ip_address: str | None = None,
    commit: bool = True,
) -> AuditLog | None:
    try:
        entry = AuditLog(
            actor_id=actor_id,
            actor_email=actor_email,
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id) if entity_id is not None else None,
            details=details,
            ip_address=ip_address,
        )
        db.session.add(entry)
        if commit:
            db.session.commit()
        return entry
    except Exception:
        if commit:
            db.session.rollback()
        return None


def log_action_later(**kwargs) -> None:
    """Write an audit row after the HTTP response path (does not block login)."""
    if not has_app_context():
        log_action(**kwargs)
        return

    app = current_app._get_current_object()

    def _run() -> None:
        with app.app_context():
            log_action(**kwargs)

    threading.Thread(target=_run, daemon=True).start()


def list_audit_logs(limit: int = 500) -> list[dict]:
    rows = (
        AuditLog.query.order_by(AuditLog.created_at.desc())
        .limit(min(max(limit, 1), 1000))
        .all()
    )
    return [row.to_dict() for row in rows]
