from flask import Blueprint

from controllers import history_controller

history_bp = Blueprint("history", __name__, url_prefix="/api")

history_bp.add_url_rule(
    "/history",
    view_func=history_controller.get_history,
    methods=["GET"],
)
history_bp.add_url_rule(
    "/history/stats",
    view_func=history_controller.get_stats,
    methods=["GET"],
)
history_bp.add_url_rule(
    "/history/<int:prediction_id>",
    view_func=history_controller.delete_history_item,
    methods=["DELETE"],
)
history_bp.add_url_rule(
    "/history/<int:prediction_id>",
    view_func=history_controller.delete_history_item,
    methods=["DELETE"],
)
