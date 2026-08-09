"""HTTP handlers for the Healthcare Advisor review queue."""

from __future__ import annotations

from flask import jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from services import auth_service, review_service


def _require_advisor():
    user = auth_service.get_user_by_id(get_jwt_identity())
    if not user:
        return None, (jsonify({"error": True, "message": "User not found."}), 404)
    if not user.is_healthcare_advisor:
        return None, (
            jsonify(
                {
                    "error": True,
                    "message": "Healthcare advisor role required.",
                }
            ),
            403,
        )
    return user, None


@jwt_required()
def list_pending():
    user, error = _require_advisor()
    if error:
        return error

    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    payload = review_service.get_pending_reviews(page=page, per_page=per_page)
    return jsonify(payload), 200


@jwt_required()
def submit():
    user, error = _require_advisor()
    if error:
        return error

    data = request.get_json(silent=True) or {}
    prediction_id = data.get("prediction_id")
    decision = data.get("decision")
    note = data.get("note")

    if prediction_id is None:
        return jsonify({"error": True, "message": "prediction_id is required."}), 400

    try:
        prediction = review_service.submit_review(
            prediction_id=prediction_id,
            advisor_id=user.id,
            decision=decision,
            note=note,
        )
    except LookupError as exc:
        return jsonify({"error": True, "message": str(exc)}), 404
    except ValueError as exc:
        return jsonify({"error": True, "message": str(exc)}), 400

    return jsonify(prediction.to_review_dict()), 200
