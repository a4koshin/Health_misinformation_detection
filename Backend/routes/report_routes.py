from flask import Blueprint

from controllers import report_controller

report_bp = Blueprint("report", __name__, url_prefix="/api")

report_bp.add_url_rule(
    "/report",
    view_func=report_controller.get_report,
    methods=["GET"],
)
report_bp.add_url_rule(
    "/report/download",
    view_func=report_controller.download_report,
    methods=["GET"],
)
report_bp.add_url_rule(
    "/report/download",
    view_func=report_controller.download_report,
    methods=["GET"],
)
