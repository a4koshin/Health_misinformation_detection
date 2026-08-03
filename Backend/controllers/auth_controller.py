from flask import jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from services import audit_service, auth_service
from utils.jwt_utils import create_token


def _client_ip() -> str | None:
    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.remote_addr


def _read_auth_payload():
    """Accept JSON {email,password} or form {username,password} (frontend)."""
    data = request.get_json(silent=True)
    if data:
        return {
            "email": data.get("email") or data.get("username"),
            "password": data.get("password"),
            "name": data.get("name") or data.get("full_name"),
        }

    return {
        "email": request.form.get("email") or request.form.get("username"),
        "password": request.form.get("password"),
        "name": request.form.get("name") or request.form.get("full_name"),
    }


def register():
    payload = _read_auth_payload()
    email = payload["email"]
    password = payload["password"]
    name = payload["name"]

    try:
        user = auth_service.register_user(email, password, name)
    except ValueError as exc:
        return jsonify({"error": True, "message": str(exc), "detail": str(exc)}), 400

    audit_service.log_action(
        actor_id=user.id,
        actor_email=user.email,
        action="user.register",
        entity_type="user",
        entity_id=user.id,
        details=f"Registered account {user.email}",
        ip_address=_client_ip(),
    )

    token = create_token(user.id)
    body = user.to_dict()
    body.update({"access_token": token, "token_type": "bearer",
                "user": user.to_dict()})
    return jsonify(body), 201


def login():
    payload = _read_auth_payload()
    email = payload["email"]
    password = payload["password"]

    try:
        user = auth_service.authenticate_user(email, password)
    except ValueError as exc:
        audit_service.log_action(
            actor_id=None,
            actor_email=(email or "").strip().lower() or None,
            action="user.login_failed",
            entity_type="user",
            details="Invalid login attempt",
            ip_address=_client_ip(),
        )
        return jsonify({"error": True, "message": str(exc), "detail": str(exc)}), 401

    audit_service.log_action(
        actor_id=user.id,
        actor_email=user.email,
        action="user.login",
        entity_type="user",
        entity_id=user.id,
        details=f"Signed in as {user.email}",
        ip_address=_client_ip(),
    )

    token = create_token(user.id)
    return jsonify(
        {
            "access_token": token,
            "token_type": "bearer",
            "user": user.to_dict(),
        }
    ), 200


@jwt_required()
def me():
    user_id = get_jwt_identity()
    user = auth_service.get_user_by_id(user_id)
    if not user:
        return jsonify(
            {"error": True, "message": "User not found.", "detail": "User not found."}
        ), 404
    payload = _read_auth_payload()


@jwt_required()
def update_me():
    user_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}
    has_full_name = "full_name" in data or "name" in data
    full_name = data.get(
        "full_name") if "full_name" in data else data.get("name")

    try:
        user = auth_service.update_profile(
            user_id,
            email=data.get("email") if "email" in data else None,
            full_name=full_name,
            update_full_name=has_full_name,
            current_password=data.get("current_password") or None,
            new_password=data.get("new_password") or data.get(
                "password") or None,
        )
    except LookupError as exc:
        return jsonify({"error": True, "message": str(exc), "detail": str(exc)}), 404
    except ValueError as exc:
        return jsonify({"error": True, "message": str(exc), "detail": str(exc)}), 400

    audit_service.log_action(
        actor_id=user.id,
        actor_email=user.email,
        action="user.profile_update",
        entity_type="user",
        entity_id=user.id,
        details="Updated profile details",
        ip_address=_client_ip(),
    )
    return jsonify(user.to_dict()), 200
    email = payload["email"]
    password = payload["password"]

    try:
        user = auth_service.authenticate_user(email, password)
    except ValueError as exc:
        return jsonify({"error": True, "message": str(exc), "detail": str(exc)}), 401

    token = create_token(user.id)
    return jsonify(
        {
            "access_token": token,
            "token_type": "bearer",
            "user": user.to_dict(),
        }
    ), 200


@jwt_required()
def me():
    user_id = get_jwt_identity()
    user = auth_service.get_user_by_id(user_id)
    if not user:
        return jsonify(
            {"error": True, "message": "User not found.", "detail": "User not found."}
        ), 404
    return jsonify(user.to_dict()), 200
