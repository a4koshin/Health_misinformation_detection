from flask import jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from services import audit_service, auth_service, db_service, predictor_service
from services import media_service


def _client_ip() -> str | None:
    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.remote_addr


def _save_prediction_for_user(user, text: str, result: dict, *, source: str):
    message = predictor_service.build_message(
        result["is_medical"],
        result["label"],
        result["topic"],
    )

    prediction = db_service.save_prediction(
        user_id=user.id,
        claim_text=text,
        is_medical=result["is_medical"],
        label=result["label"],
        label_confidence=result["label_confidence"],
        topic=result["topic"],
        topic_confidence=result["topic_confidence"],
        cleaned_text=result.get("cleaned_text"),
        source=source,
    )

    label_text = result["label"] or (
        "Non-medical" if not result["is_medical"] else "Pending"
    )
    audit_service.log_action(
        actor_id=user.id,
        actor_email=user.email,
        action="prediction.create",
        entity_type="prediction",
        entity_id=prediction.id,
        details=f"Predicted {source} claim as {label_text}",
        ip_address=_client_ip(),
    )

    return prediction, message


@jwt_required()
def predict():
    data = request.get_json(silent=True) or {}
    text = (data.get("text") or "").strip()

    if not text:
        return jsonify({"error": True, "message": "Text is required."}), 400

    user = auth_service.get_user_by_id(get_jwt_identity())
    if not user:
        return jsonify({"error": True, "message": "User not found."}), 404

    try:
        result = predictor_service.run_full_pipeline(text)
    except RuntimeError as exc:
        return jsonify({"error": True, "message": str(exc)}), 503

    prediction, message = _save_prediction_for_user(
        user, text, result, source="Manual check"
    )

    return jsonify(
        {
            "prediction_id": prediction.id,
            "is_medical": result["is_medical"],
            "label": result["label"],
            "label_confidence": result["label_confidence"],
            "topic": result["topic"],
            "topic_confidence": result["topic_confidence"],
            "message": message,
            "transcript": text,
        }
    ), 200


@jwt_required()
def predict_media():
    kind = (request.form.get("kind") or "").strip().lower()
    if kind not in {"audio", "video"}:
        return jsonify(
            {"error": True, "message": "Upload kind must be 'audio' or 'video'."}
        ), 400

    file = request.files.get("file")
    user = auth_service.get_user_by_id(get_jwt_identity())
    if not user:
        return jsonify({"error": True, "message": "User not found."}), 404

    try:
        transcript = media_service.transcribe_media(file, kind=kind)
    except ValueError as exc:
        return jsonify({"error": True, "message": str(exc)}), 400
    except RuntimeError as exc:
        return jsonify({"error": True, "message": str(exc)}), 503

    if not transcript:
        return jsonify(
            {"error": True, "message": "No speech was detected in this file."}
        ), 400

    try:
        result = predictor_service.run_full_pipeline(transcript)
    except RuntimeError as exc:
        return jsonify({"error": True, "message": str(exc)}), 503

    source = "Video upload" if kind == "video" else "Audio upload"
    prediction, message = _save_prediction_for_user(
        user, transcript, result, source=source
    )

    return jsonify(
        {
            "prediction_id": prediction.id,
            "kind": kind,
            "filename": file.filename if file else None,
            "transcript": transcript,
            "is_medical": result["is_medical"],
            "label": result["label"],
            "label_confidence": result["label_confidence"],
            "topic": result["topic"],
            "topic_confidence": result["topic_confidence"],
            "message": message,
        }
    ), 200
