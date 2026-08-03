from flask import Blueprint

from controllers import predict_controller

predict_bp = Blueprint("predict", __name__, url_prefix="/api")

predict_bp.add_url_rule(
    "/predict",
    view_func=predict_controller.predict,
    methods=["POST"],
)
predict_bp.add_url_rule(
    "/predict/media",
    view_func=predict_controller.predict_media,
    methods=["POST"],
    endpoint="predict_media",
)
