from flask import Blueprint

from controllers import transcription_controller

transcription_bp = Blueprint("transcription", __name__, url_prefix="/api")

transcription_bp.add_url_rule(
    "/transcribe",
    view_func=transcription_controller.transcribe,
    methods=["POST"],
    endpoint="transcribe",
)
