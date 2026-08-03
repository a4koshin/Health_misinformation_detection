from flask import jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from services import audit_service, auth_service, db_service


def _client_ip() -> str | None:
    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.remote_addr


@jwt_required()
def get_history():
    user_id = int(get_jwt_identity())
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 50, type=int)

    result = db_service.get_user_predictions(user_id, page=page, per_page=per_page)
    return jsonify(result["items"]), 200


@jwt_required()
def get_stats():
    user_id = int(get_jwt_identity())
    stats = db_service.get_user_dashboard_stats(user_id)
    return jsonify(stats), 200


@jwt_required()
def delete_history_item(prediction_id: int):
    user = auth_service.get_user_by_id(get_jwt_identity())
    if not user:
        return jsonify({"error": True, "message": "User not found."}), 404

    deleted = db_service.delete_prediction(user.id, prediction_id)
    if not deleted:
        return jsonify(
            {
                "error": True,
                "message": "Prediction not found.",
                "detail": "Prediction not found.",
            }
        ), 404

    audit_service.log_action(
        actor_id=user.id,
        actor_email=user.email,
        action="prediction.delete",
        entity_type="prediction",
        entity_id=prediction_id,
        details=f"Deleted prediction #{prediction_id}",
        ip_address=_client_ip(),
    )
    return "", 204
    return jsonify(result["items"]), 200


@jwt_required()
def delete_history_item(prediction_id: int):
    user_id = int(get_jwt_identity())
    deleted = db_service.delete_prediction(user_id, prediction_id)
    if not deleted:
        return jsonify({"error": True, "message": "Prediction not found.", "detail": "Prediction not found."}), 404
    return "", 204
