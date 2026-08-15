from flask import Blueprint

from controllers import appointment_controller

appointment_bp = Blueprint("appointments", __name__, url_prefix="/api")

appointment_bp.add_url_rule(
    "/appointments/payment-config",
    view_func=appointment_controller.payment_config,
    methods=["GET"],
    endpoint="appointment_payment_config",
)
appointment_bp.add_url_rule(
    "/appointments",
    view_func=appointment_controller.list_appointments,
    methods=["GET"],
    endpoint="list_appointments",
)
appointment_bp.add_url_rule(
    "/appointments",
    view_func=appointment_controller.create_appointment,
    methods=["POST"],
    endpoint="create_appointment",
)
appointment_bp.add_url_rule(
    "/appointments/<int:appointment_id>",
    view_func=appointment_controller.update_appointment,
    methods=["PATCH"],
    endpoint="update_appointment",
)
appointment_bp.add_url_rule(
    "/appointments/availability",
    view_func=appointment_controller.list_availability,
    methods=["GET"],
    endpoint="list_availability",
)
appointment_bp.add_url_rule(
    "/appointments/availability",
    view_func=appointment_controller.create_availability,
    methods=["POST"],
    endpoint="create_availability",
)
appointment_bp.add_url_rule(
    "/appointments/availability/<int:availability_id>",
    view_func=appointment_controller.delete_availability,
    methods=["DELETE"],
    endpoint="delete_availability",
)
