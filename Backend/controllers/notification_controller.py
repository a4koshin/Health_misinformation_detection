from flask import jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from services import auth_service, notification_service


@jwt_required()
def list_notifications():
    user = auth_service.get_user_by_id(get_jwt_identity())
    if not user:
        return jsonify({"error": True, "message": "User not found."}), 404
    limit = request.args.get("limit", 40, type=int)
    items = notification_service.list_notifications(user.id, limit=limit)
    return jsonify(
        {
            "items": items,
            "unread_count": notification_service.unread_count(user.id),
        }
    ), 200


@jwt_required()
def unread_count():
    user = auth_service.get_user_by_id(get_jwt_identity())
    if not user:
        return jsonify({"error": True, "message": "User not found."}), 404
    return jsonify({"unread_count": notification_service.unread_count(user.id)}), 200


@jwt_required()
def mark_read(notification_id: int):
    user = auth_service.get_user_by_id(get_jwt_identity())
    if not user:
        return jsonify({"error": True, "message": "User not found."}), 404
    try:
        row = notification_service.mark_read(user.id, notification_id)
    except LookupError as exc:
        return jsonify({"error": True, "message": str(exc)}), 404
    return jsonify(row.to_dict()), 200


@jwt_required()
def mark_all_read():
    user = auth_service.get_user_by_id(get_jwt_identity())
    if not user:
        return jsonify({"error": True, "message": "User not found."}), 404
    updated = notification_service.mark_all_read(user.id)
    return jsonify({"updated": updated, "unread_count": 0}), 200
