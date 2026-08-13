from flask import Blueprint

from controllers import history_controller

history_bp = Blueprint("history", __name__, url_prefix="/api")

history_bp.add_url_rule(
    "/history",
    view_func=history_controller.get_history,
    methods=["GET"],
    endpoint="get_history",
)
history_bp.add_url_rule(
    "/history",
    view_func=history_controller.create_conversation,
    methods=["POST"],
    endpoint="create_conversation",
)
history_bp.add_url_rule(
    "/history/stats",
    view_func=history_controller.get_stats,
    methods=["GET"],
    endpoint="get_history_stats",
)
history_bp.add_url_rule(
    "/history/corrections",
    view_func=history_controller.get_corrections,
    methods=["GET"],
    endpoint="get_corrections",
)
history_bp.add_url_rule(
    "/history/<int:prediction_id>",
    view_func=history_controller.get_conversation,
    methods=["GET"],
    endpoint="get_conversation",
)
history_bp.add_url_rule(
    "/history/<int:prediction_id>",
    view_func=history_controller.delete_history_item,
    methods=["DELETE"],
    endpoint="delete_history_item",
)
history_bp.add_url_rule(
    "/history/<int:prediction_id>/active",
    view_func=history_controller.set_prediction_active,
    methods=["PATCH"],
    endpoint="set_prediction_active",
)
history_bp.add_url_rule(
    "/history/<int:prediction_id>/messages",
    view_func=history_controller.append_message,
    methods=["POST"],
    endpoint="append_message",
)
history_bp.add_url_rule(
    "/history/<int:prediction_id>/messages/<string:message_id>",
    view_func=history_controller.edit_message,
    methods=["PATCH"],
    endpoint="edit_message",
)
