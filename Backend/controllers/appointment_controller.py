from flask import jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from services import appointment_service, auth_service


def _current_user():
    user = auth_service.get_user_by_id(get_jwt_identity())
    if not user:
        return None, (jsonify({"error": True, "message": "User not found."}), 404)
    return user, None


@jwt_required()
def list_appointments():
    user, error = _current_user()
    if error:
        return error
    return jsonify({"items": appointment_service.list_appointments(user)}), 200


@jwt_required()
def list_availability():
    user, error = _current_user()
    if error:
        return error
    doctor_user_id = request.args.get("doctor_user_id", type=int)
    try:
        items = appointment_service.list_availability(
            actor=user, doctor_user_id=doctor_user_id
        )
    except LookupError as exc:
        return jsonify({"error": True, "message": str(exc)}), 404
    except ValueError as exc:
        return jsonify({"error": True, "message": str(exc)}), 400
    return jsonify({"items": items}), 200


@jwt_required()
def create_availability():
    user, error = _current_user()
    if error:
        return error
    data = request.get_json(silent=True) or {}
    try:
        slot = appointment_service.create_availability(
            doctor=user,
            starts_at=data.get("starts_at"),
            ends_at=data.get("ends_at"),
        )
    except PermissionError as exc:
        return jsonify({"error": True, "message": str(exc)}), 403
    except ValueError as exc:
        return jsonify({"error": True, "message": str(exc)}), 400
    return jsonify(slot.to_dict(booked=False)), 201


@jwt_required()
def delete_availability(availability_id: int):
    user, error = _current_user()
    if error:
        return error
    try:
        appointment_service.delete_availability(
            doctor=user, availability_id=availability_id
        )
    except LookupError as exc:
        return jsonify({"error": True, "message": str(exc)}), 404
    except PermissionError as exc:
        return jsonify({"error": True, "message": str(exc)}), 403
    except ValueError as exc:
        return jsonify({"error": True, "message": str(exc)}), 400
    return jsonify({"message": "Available time removed."}), 200


@jwt_required()
def create_appointment():
    user, error = _current_user()
    if error:
        return error

    data = request.get_json(silent=True) or {}
    prediction_id = data.get("prediction_id")
    availability_id = data.get("availability_id")
    if prediction_id is None:
        return jsonify({"error": True, "message": "prediction_id is required."}), 400
    if availability_id is None:
        return jsonify({"error": True, "message": "Pick an available date and time."}), 400

    try:
        appointment = appointment_service.create_appointment(
            user=user,
            prediction_id=int(prediction_id),
            availability_id=int(availability_id),
            note=data.get("note"),
        )
    except LookupError as exc:
        return jsonify({"error": True, "message": str(exc)}), 404
    except PermissionError as exc:
        return jsonify({"error": True, "message": str(exc)}), 403
    except ValueError as exc:
        return jsonify({"error": True, "message": str(exc)}), 400

    return jsonify(appointment_service.serialize_appointment(appointment)), 201


@jwt_required()
def update_appointment(appointment_id: int):
    user, error = _current_user()
    if error:
        return error

    data = request.get_json(silent=True) or {}
    if "status" not in data:
        return jsonify({"error": True, "message": "status is required."}), 400

    try:
        appointment = appointment_service.update_appointment_status(
            actor=user,
            appointment_id=appointment_id,
            status=data.get("status"),
        )
    except LookupError as exc:
        return jsonify({"error": True, "message": str(exc)}), 404
    except PermissionError as exc:
        return jsonify({"error": True, "message": str(exc)}), 403
    except ValueError as exc:
        return jsonify({"error": True, "message": str(exc)}), 400

    return jsonify(appointment_service.serialize_appointment(appointment)), 200
