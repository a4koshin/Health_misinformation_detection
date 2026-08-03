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
        db.session.commit()
        return entry
    except Exception:
        db.session.rollback()
        return None


def list_audit_logs(limit: int = 500) -> list[dict]:
    rows = (
        AuditLog.query.order_by(AuditLog.created_at.desc())
        .limit(min(max(limit, 1), 1000))
        .all()
    )
    return [row.to_dict() for row in rows]
