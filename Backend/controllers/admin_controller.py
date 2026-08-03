from flask import jsonify, request
from flask_jwt_extended import jwt_required

from services import admin_service, audit_service, auth_service


def _client_ip() -> str | None:
    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.remote_addr


@jwt_required()
def dashboard():
    try:
        admin_service.require_admin()
        stats = admin_service.get_admin_dashboard_stats()
    except PermissionError as exc:
        return jsonify({"error": True, "message": str(exc), "detail": str(exc)}), 403
    return jsonify(stats), 200


@jwt_required()
def list_users():
    try:
        admin_service.require_admin()
        data = admin_service.list_users()
    except PermissionError as exc:
        return jsonify({"error": True, "message": str(exc), "detail": str(exc)}), 403
    return jsonify(data), 200


@jwt_required()
def create_user():
    try:
        admin = admin_service.require_admin()
    except PermissionError as exc:
        return jsonify({"error": True, "message": str(exc), "detail": str(exc)}), 403

    data = request.get_json(silent=True) or {}
    try:
        user = admin_service.create_user(
            email=data.get("email"),
            password=data.get("password"),
            full_name=data.get("full_name") or data.get("name"),
            role=data.get("role"),
        )
    except ValueError as exc:
        return jsonify({"error": True, "message": str(exc), "detail": str(exc)}), 400

    audit_service.log_action(
        actor_id=admin.id,
        actor_email=admin.email,
        action="user.create",
        entity_type="user",
        entity_id=user.id,
        details=f"Created user {user.email} ({user.role})",
        ip_address=_client_ip(),
    )
    return jsonify(user.to_dict()), 201


@jwt_required()
def update_user(user_id: int):
    try:
        admin = admin_service.require_admin()
    except PermissionError as exc:
        return jsonify({"error": True, "message": str(exc), "detail": str(exc)}), 403

    data = request.get_json(silent=True) or {}
    has_full_name = "full_name" in data or "name" in data
    full_name = data.get("full_name") if "full_name" in data else data.get("name")

    try:
        user = admin_service.update_user(
            user_id=user_id,
            actor_id=admin.id,
            email=data.get("email") if "email" in data else None,
            full_name=full_name,
            update_full_name=has_full_name,
            password=data.get("password") or None,
            role=data.get("role") if "role" in data else None,
        )
    except LookupError as exc:
        return jsonify({"error": True, "message": str(exc), "detail": str(exc)}), 404
    except ValueError as exc:
        return jsonify({"error": True, "message": str(exc), "detail": str(exc)}), 400

    audit_service.log_action(
        actor_id=admin.id,
        actor_email=admin.email,
        action="user.update",
        entity_type="user",
        entity_id=user.id,
        details=f"Updated user {user.email}",
        ip_address=_client_ip(),
    )
    return jsonify(user.to_dict()), 200


@jwt_required()
def delete_user(user_id: int):
    try:
        admin = admin_service.require_admin()
    except PermissionError as exc:
        return jsonify({"error": True, "message": str(exc), "detail": str(exc)}), 403

    target = auth_service.get_user_by_id(user_id)
    target_email = target.email if target else str(user_id)

    try:
        admin_service.delete_user(user_id=user_id, actor_id=admin.id)
    except LookupError as exc:
        return jsonify({"error": True, "message": str(exc), "detail": str(exc)}), 404
    except ValueError as exc:
        return jsonify({"error": True, "message": str(exc), "detail": str(exc)}), 400

    audit_service.log_action(
        actor_id=admin.id,
        actor_email=admin.email,
        action="user.delete",
        entity_type="user",
        entity_id=user_id,
        details=f"Deleted user {target_email}",
        ip_address=_client_ip(),
    )
    return "", 204


@jwt_required()
def audit_logs():
    try:
        admin_service.require_admin()
        data = audit_service.list_audit_logs()
    except PermissionError as exc:
        return jsonify({"error": True, "message": str(exc), "detail": str(exc)}), 403
    return jsonify(data), 200
