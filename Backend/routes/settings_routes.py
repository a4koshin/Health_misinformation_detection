from flask import Blueprint

from controllers import settings_controller

settings_bp = Blueprint("settings", __name__, url_prefix="/api/settings")

settings_bp.add_url_rule(
    "/profile",
    view_func=settings_controller.get_profile,
    methods=["GET"],
)
settings_bp.add_url_rule(
    "/profile",
    view_func=settings_controller.update_profile,
    methods=["PUT"],
    endpoint="update_profile",
)
settings_bp.add_url_rule(
    "/password",
    view_func=settings_controller.change_password,
    methods=["PUT"],
)
settings_bp.add_url_rule(
    "/language",
    view_func=settings_controller.update_language,
    methods=["PUT"],
)
settings_bp.add_url_rule(
    "/avatar",
    view_func=settings_controller.upload_avatar,
    methods=["POST"],
)
settings_bp.add_url_rule(
    "/history",
    view_func=settings_controller.delete_history,
    methods=["DELETE"],
)
settings_bp.add_url_rule(
    "/account",
    view_func=settings_controller.delete_account,
    methods=["DELETE"],
)
settings_bp.add_url_rule(
    "/database",
    view_func=settings_controller.wipe_database,
    methods=["DELETE"],
)
