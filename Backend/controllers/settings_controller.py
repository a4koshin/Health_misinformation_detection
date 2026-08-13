from flask import jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from services import audit_service, settings_service


def _client_ip() -> str | None:
    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.remote_addr


def _current_user_id():
    return get_jwt_identity()


@jwt_required()
def get_profile():
    user = settings_service.get_user(_current_user_id())
    if not user:
        return jsonify({"error": True, "message": "User not found."}), 404
    return jsonify(user.to_settings_profile()), 200


@jwt_required()
def update_profile():
    data = request.get_json(silent=True) or {}
    name = data.get("name") if "name" in data else data.get("full_name")
    email = data.get("email")

    try:
        user = settings_service.update_profile(_current_user_id(), name, email)
    except LookupError as exc:
        return jsonify({"error": True, "message": str(exc)}), 404
    except ValueError as exc:
        return jsonify({"error": True, "message": str(exc)}), 400

    audit_service.log_action(
        actor_id=user.id,
        actor_email=user.email,
        action="settings.profile_update",
        entity_type="user",
        entity_id=user.id,
        details="Updated settings profile",
        ip_address=_client_ip(),
    )
    return jsonify(
        {
            "message": "Profile updated successfully.",
            **user.to_settings_profile(),
        }
    ), 200


@jwt_required()
def change_password():
    data = request.get_json(silent=True) or {}
    try:
        user = settings_service.change_password(
            _current_user_id(),
            data.get("current_password") or "",
            data.get("new_password") or "",
        )
    except LookupError as exc:
        return jsonify({"error": True, "message": str(exc)}), 404
    except ValueError as exc:
        return jsonify({"error": True, "message": str(exc)}), 400

    audit_service.log_action(
        actor_id=user.id,
        actor_email=user.email,
        action="settings.password_change",
        entity_type="user",
        entity_id=user.id,
        details="Changed account password",
        ip_address=_client_ip(),
    )
    return jsonify({"message": "Password updated successfully."}), 200


@jwt_required()
def update_language():
    data = request.get_json(silent=True) or {}
    try:
        user = settings_service.update_language(
            _current_user_id(),
            data.get("language") or "",
        )
    except LookupError as exc:
        return jsonify({"error": True, "message": str(exc)}), 404
    except ValueError as exc:
        return jsonify({"error": True, "message": str(exc)}), 400

    audit_service.log_action(
        actor_id=user.id,
        actor_email=user.email,
        action="settings.language_update",
        entity_type="user",
        entity_id=user.id,
        details=f"Set language to {user.language_preference}",
        ip_address=_client_ip(),
    )
    return jsonify(
        {
            "message": "Language preference updated.",
            "language_preference": user.language_preference,
        }
    ), 200


@jwt_required()
def upload_avatar():
    file = request.files.get("file") or request.files.get("avatar")
    try:
        user = settings_service.upload_avatar(_current_user_id(), file)
    except LookupError as exc:
        return jsonify({"error": True, "message": str(exc)}), 404
    except ValueError as exc:
        return jsonify({"error": True, "message": str(exc)}), 400

    audit_service.log_action(
        actor_id=user.id,
        actor_email=user.email,
        action="settings.avatar_upload",
        entity_type="user",
        entity_id=user.id,
        details="Uploaded a new avatar",
        ip_address=_client_ip(),
    )
    return jsonify(
        {
            "message": "Avatar uploaded successfully.",
            "avatar_url": user.avatar_url,
        }
    ), 200


@jwt_required()
def delete_history():
    return jsonify(
        {
            "error": True,
            "message": "History records cannot be deleted.",
        }
    ), 403


@jwt_required()
def request_account_deletion():
    data = request.get_json(silent=True) or {}
    password = data.get("password") or ""
    try:
        user = settings_service.request_account_deletion(
            _current_user_id(), password
        )
    except LookupError as exc:
        return jsonify({"error": True, "message": str(exc)}), 404
    except PermissionError as exc:
        return jsonify({"error": True, "message": str(exc)}), 403
    except ValueError as exc:
        return jsonify({"error": True, "message": str(exc)}), 400

    audit_service.log_action(
        actor_id=user.id,
        actor_email=user.email,
        action="settings.account_deletion_request",
        entity_type="user",
        entity_id=user.id,
        details=f"Requested account deletion for {user.email}",
        ip_address=_client_ip(),
    )
    return jsonify(
        {
            "message": "Deletion request sent. An admin will review and deactivate the account.",
            **user.to_settings_profile(),
        }
    ), 200


@jwt_required()
def wipe_database():
    data = request.get_json(silent=True) or {}
    password = data.get("password") or ""
    try:
        summary = settings_service.wipe_all_data(_current_user_id(), password)
    except LookupError as exc:
        return jsonify({"error": True, "message": str(exc)}), 404
    except PermissionError as exc:
        return jsonify({"error": True, "message": str(exc)}), 403
    except ValueError as exc:
        return jsonify({"error": True, "message": str(exc)}), 400

    user = settings_service.get_user(_current_user_id())
    if user:
        audit_service.log_action(
            actor_id=user.id,
            actor_email=user.email,
            action="settings.database_wipe",
            entity_type="database",
            details=(
                f"Wiped database data "
                f"(predictions={summary['predictions_deleted']}, "
                f"users={summary['users_deleted']}, "
                f"audit_logs={summary['audit_logs_deleted']})"
            ),
            ip_address=_client_ip(),
        )

    return jsonify(
        {
            "message": "All database data has been deleted. Your admin account was kept.",
            **summary,
        }
    ), 200
