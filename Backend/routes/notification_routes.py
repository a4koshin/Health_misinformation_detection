from flask import Blueprint

from controllers import notification_controller

notification_bp = Blueprint("notifications", __name__, url_prefix="/api/notifications")

notification_bp.add_url_rule(
    "",
    view_func=notification_controller.list_notifications,
    methods=["GET"],
    endpoint="list_notifications",
)
notification_bp.add_url_rule(
    "/unread-count",
    view_func=notification_controller.unread_count,
    methods=["GET"],
    endpoint="unread_count",
)
notification_bp.add_url_rule(
    "/stream",
    view_func=notification_controller.stream_notifications,
    methods=["GET"],
    endpoint="stream_notifications",
)
notification_bp.add_url_rule(
    "/read-all",
    view_func=notification_controller.mark_all_read,
    methods=["POST"],
    endpoint="mark_all_read",
)
notification_bp.add_url_rule(
    "/<int:notification_id>/read",
    view_func=notification_controller.mark_read,
    methods=["POST"],
    endpoint="mark_read",
)
