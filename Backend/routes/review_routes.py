from flask import Blueprint

from controllers import review_controller

review_bp = Blueprint("review", __name__, url_prefix="/api/review")

review_bp.add_url_rule(
    "/queue",
    view_func=review_controller.list_pending,
    methods=["GET"],
    endpoint="review_queue",
)
review_bp.add_url_rule(
    "/submit",
    view_func=review_controller.submit,
    methods=["POST"],
    endpoint="review_submit",
)
