from flask import Response, jsonify, request, stream_with_context
from flask_jwt_extended import decode_token, get_jwt_identity, jwt_required
from queue import Empty
import json

from services import auth_service, notification_hub, notification_service


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


def stream_notifications():
    """Server-Sent Events: push a refresh ping when this user gets a notification."""
    token = (request.args.get("token") or "").strip()
    if not token:
        auth = request.headers.get("Authorization") or ""
        if auth.lower().startswith("bearer "):
            token = auth[7:].strip()
    if not token:
        return jsonify({"error": True, "message": "Authentication required."}), 401

    try:
        decoded = decode_token(token)
        user_id = int(decoded["sub"])
    except Exception:
        return jsonify({"error": True, "message": "Invalid or expired token."}), 401

    user = auth_service.get_user_by_id(user_id)
    if not user or not user.is_active:
        return jsonify({"error": True, "message": "User not found."}), 404

    queue = notification_hub.subscribe(user_id)

    @stream_with_context
    def generate():
        try:
            yield 'event: connected\ndata: {"ok":true}\n\n'
            while True:
                try:
                    message = queue.get(timeout=20)
                    yield f"data: {json.dumps(message)}\n\n"
                except Empty:
                    yield ": keepalive\n\n"
        finally:
            notification_hub.unsubscribe(user_id, queue)

    return Response(
        generate(),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
