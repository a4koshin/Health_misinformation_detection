from flask import jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from extensions import db
from models.prediction import Prediction
from services import (
    audit_service,
    auth_service,
    db_service,
    notification_service,
    predictor_service,
)
from services import media_service
from services.claim_validation_service import validate_somali_claim_input


def _client_ip() -> str | None:
    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.remote_addr


def _save_prediction_for_user(user, text: str, result: dict, *, source: str):
    message = result.get("message") or predictor_service.build_message(
        result["is_medical"],
        result["label"],
    )

    prediction = db_service.save_prediction(
        user_id=user.id,
        claim_text=text,
        is_medical=result["is_medical"],
        label=result["label"],
        label_confidence=result["label_confidence"],
        cleaned_text=result.get("cleaned_text"),
        source=source,
        commit=False,
    )
    prediction.summary = message
    db.session.flush()

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
        commit=False,
    )
    db.session.commit()
    if prediction.needs_review:
        notification_service.notify_non_reliable_claim(prediction)

    return prediction, message


@jwt_required()
def predict():
    data = request.get_json(silent=True) or {}
    text = (data.get("text") or "").strip()

    ok, error_message = validate_somali_claim_input(text)
    if not ok:
        return jsonify({"error": True, "message": error_message}), 400

    user = auth_service.get_user_by_id(get_jwt_identity())
    if not user:
        return jsonify({"error": True, "message": "User not found."}), 404
    if user.is_doctor:
        return jsonify(
            {
                "error": True,
                "message": "Doctors cannot run predictions.",
            }
        ), 403

    try:
        result = predictor_service.classify_claim(text)
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
            "message": message,
            "sources": [],
            "similar_terms": [],
            "transcript": text,
            "model": result.get("model"),
            "pred_id": result.get("pred_id"),
            "class_probs": result.get("class_probs"),
            "enrichment_pending": bool(result.get("enrichment_pending")),
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
    if user.is_doctor:
        return jsonify(
            {
                "error": True,
                "message": "Doctors cannot run predictions.",
            }
        ), 403

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
        result = predictor_service.classify_claim(transcript)
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
            "message": message,
            "sources": [],
            "similar_terms": [],
            "model": result.get("model"),
            "pred_id": result.get("pred_id"),
            "class_probs": result.get("class_probs"),
            "enrichment_pending": bool(result.get("enrichment_pending")),
        }
    ), 200


@jwt_required()
def enrich(prediction_id: int):
    """Second step: Cerebras/Groq explanation + search. SomBERTb label stays fixed."""
    user = auth_service.get_user_by_id(get_jwt_identity())
    if not user:
        return jsonify({"error": True, "message": "User not found."}), 404

    prediction = Prediction.query.filter_by(
        id=prediction_id, user_id=user.id
    ).first()
    if not prediction:
        return jsonify({"error": True, "message": "Prediction not found."}), 404

    label = prediction.label
    if prediction.source == "non_medical" or label in {None, "Non-medical", "Pending"}:
        return jsonify(
            {
                "prediction_id": prediction.id,
                "message": prediction.summary
                or predictor_service.build_message(False, None),
                "sources": [],
                "similar_terms": [],
                "enrichment_pending": False,
            }
        ), 200

    try:
        explanation = predictor_service.enrich_explanation(
            prediction.claim_text, label
        )
    except Exception as exc:  # noqa: BLE001
        return jsonify(
            {
                "prediction_id": prediction.id,
                "message": prediction.summary
                or predictor_service.build_message(True, label),
                "sources": [],
                "similar_terms": [],
                "enrichment_pending": False,
                "enrichment_error": str(exc),
            }
        ), 200

    message = explanation.get("message") or prediction.summary
    prediction.summary = message
    db.session.commit()

    return jsonify(
        {
            "prediction_id": prediction.id,
            "message": message,
            "sources": explanation.get("sources") or [],
            "similar_terms": explanation.get("similar_terms") or [],
            "enrichment_pending": False,
        }
    ), 200
