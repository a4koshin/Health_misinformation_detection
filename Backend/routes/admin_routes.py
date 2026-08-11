from flask import Blueprint

from controllers import admin_controller

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")

admin_bp.add_url_rule(
    "/dashboard",
    view_func=admin_controller.dashboard,
    methods=["GET"],
)
admin_bp.add_url_rule(
    "/users",
    view_func=admin_controller.list_users,
    methods=["GET"],
)
admin_bp.add_url_rule(
    "/users",
    view_func=admin_controller.create_user,
    methods=["POST"],
    endpoint="create_user",
)
admin_bp.add_url_rule(
    "/users/<int:user_id>",
    view_func=admin_controller.update_user,
    methods=["PATCH"],
    endpoint="update_user",
)
admin_bp.add_url_rule(
    "/users/<int:user_id>",
    view_func=admin_controller.delete_user,
    methods=["DELETE"],
    endpoint="delete_user",
)
admin_bp.add_url_rule(
    "/users/<int:user_id>/approve-deletion",
    view_func=admin_controller.approve_account_deletion,
    methods=["POST"],
    endpoint="approve_account_deletion",
)
admin_bp.add_url_rule(
    "/audit-logs",
    view_func=admin_controller.audit_logs,
    methods=["GET"],
)
admin_bp.add_url_rule(
    "/dataset/predict",
    view_func=admin_controller.predict_dataset,
    methods=["POST"],
    endpoint="predict_dataset",
)
