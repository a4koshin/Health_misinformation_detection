from flask import jsonify, request
from flask_jwt_extended import jwt_required

from services import admin_service, audit_service, doctor_service


def _client_ip() -> str | None:
    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.remote_addr


def _form_or_json() -> dict:
    if request.content_type and "multipart/form-data" in request.content_type:
        return request.form.to_dict()
    return request.get_json(silent=True) or {}


@jwt_required()
def list_doctors():
    try:
        admin_service.require_admin()
        data = doctor_service.list_doctors()
    except PermissionError as exc:
        return jsonify({"error": True, "message": str(exc), "detail": str(exc)}), 403
    return jsonify(data), 200


@jwt_required()
def create_doctor():
    try:
        admin = admin_service.require_admin()
    except PermissionError as exc:
        return jsonify({"error": True, "message": str(exc), "detail": str(exc)}), 403

    data = _form_or_json()
    try:
        doctor = doctor_service.create_doctor(
            email=data.get("email"),
            password=data.get("password"),
            name=data.get("name") or data.get("full_name"),
            job_title=data.get("job_title"),
            workplace=data.get("workplace") or data.get("where_works"),
            license_file=request.files.get("license")
            or request.files.get("license_file"),
            profile_image_file=request.files.get("profile_image")
            or request.files.get("profile_image_file"),
        )
    except ValueError as exc:
        return jsonify({"error": True, "message": str(exc), "detail": str(exc)}), 400

    audit_service.log_action(
        actor_id=admin.id,
        actor_email=admin.email,
        action="doctor.create",
        entity_type="doctor",
        entity_id=int(doctor["id"]),
        details=f"Created doctor {doctor.get('email')} ({doctor.get('name')})",
        ip_address=_client_ip(),
    )
    return jsonify(doctor), 201


@jwt_required()
def update_doctor(doctor_id: int):
    try:
        admin = admin_service.require_admin()
    except PermissionError as exc:
        return jsonify({"error": True, "message": str(exc), "detail": str(exc)}), 403

    data = _form_or_json()
    has_name = "name" in data or "full_name" in data
    name = data.get("name") if "name" in data else data.get("full_name")

    try:
        doctor = doctor_service.update_doctor(
            doctor_id=doctor_id,
            email=data.get("email") if "email" in data else None,
            name=name,
            update_name=has_name,
            job_title=data.get("job_title") if "job_title" in data else None,
            workplace=(
                data.get("workplace")
                if "workplace" in data
                else data.get("where_works")
                if "where_works" in data
                else None
            ),
            password=data.get("password") or None,
            license_file=request.files.get("license")
            or request.files.get("license_file"),
            profile_image_file=request.files.get("profile_image")
            or request.files.get("profile_image_file"),
        )
    except LookupError as exc:
        return jsonify({"error": True, "message": str(exc), "detail": str(exc)}), 404
    except ValueError as exc:
        return jsonify({"error": True, "message": str(exc), "detail": str(exc)}), 400

    audit_service.log_action(
        actor_id=admin.id,
        actor_email=admin.email,
        action="doctor.update",
        entity_type="doctor",
        entity_id=doctor_id,
        details=f"Updated doctor {doctor.get('email')}",
        ip_address=_client_ip(),
    )
    return jsonify(doctor), 200


@jwt_required()
def delete_doctor(doctor_id: int):
    try:
        admin = admin_service.require_admin()
    except PermissionError as exc:
        return jsonify({"error": True, "message": str(exc), "detail": str(exc)}), 403

    try:
        deleted = doctor_service.delete_doctor(
            doctor_id=doctor_id, actor_id=admin.id
        )
    except LookupError as exc:
        return jsonify({"error": True, "message": str(exc), "detail": str(exc)}), 404
    except ValueError as exc:
        return jsonify({"error": True, "message": str(exc), "detail": str(exc)}), 400

    audit_service.log_action(
        actor_id=admin.id,
        actor_email=admin.email,
        action="doctor.delete",
        entity_type="doctor",
        entity_id=doctor_id,
        details=f"Deleted doctor {deleted['email']}",
        ip_address=_client_ip(),
    )
    return jsonify({"message": "Doctor deleted.", **deleted}), 200
