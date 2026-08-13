"""Admin handlers for assigning Non-Reliable claims to doctors."""

from flask import jsonify, request
from flask_jwt_extended import jwt_required

from models.prediction import Prediction
from services import admin_service, review_service


@jwt_required()
def list_assignment_queue():
    try:
        admin_service.require_admin()
    except PermissionError as exc:
        return jsonify({"error": True, "message": str(exc), "detail": str(exc)}), 403

    status = request.args.get("status", "awaiting_assignment")
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 50, type=int)
    payload = review_service.get_admin_assignment_queue(
        status=status, page=page, per_page=per_page
    )
    return jsonify(payload), 200


@jwt_required()
def assign_review():
    try:
        admin = admin_service.require_admin()
    except PermissionError as exc:
        return jsonify({"error": True, "message": str(exc), "detail": str(exc)}), 403

    data = request.get_json(silent=True) or {}
    prediction_id = data.get("prediction_id")
    doctor_user_id = (
        data.get("doctor_user_id")
        or data.get("advisor_id")
        or data.get("user_id")
    )
    if prediction_id is None:
        return jsonify({"error": True, "message": "prediction_id is required."}), 400
    if doctor_user_id is None:
        return jsonify({"error": True, "message": "doctor_user_id is required."}), 400

    try:
        prediction = review_service.assign_review(
            prediction_id=prediction_id,
            doctor_user_id=doctor_user_id,
            admin=admin,
        )
    except LookupError as exc:
        return jsonify({"error": True, "message": str(exc)}), 404
    except ValueError as exc:
        return jsonify({"error": True, "message": str(exc)}), 400

    return jsonify(Prediction.serialize_many([prediction], review=True)[0]), 200
