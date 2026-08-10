from flask import jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from extensions import db
from models.prediction import Prediction
from services import audit_service, auth_service, db_service, predictor_service
from services.claim_validation_service import validate_somali_claim_input


def _client_ip() -> str | None:
    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.remote_addr


def _assistant_message(result: dict) -> str:
    return result.get("message") or predictor_service.build_message(
        result["is_medical"],
        result["label"],
    )


def _prediction_to_conversation(prediction: Prediction, message: str) -> dict:
    created = prediction.created_at.isoformat() if prediction.created_at else None
    payload = prediction.to_dict()
    payload["messages"] = [
        {
            "id": f"{prediction.id}-user",
            "role": "user",
            "content": prediction.claim_text,
            "created_at": created,
        },
        {
            "id": f"{prediction.id}-assistant",
            "role": "assistant",
            "content": message,
            "created_at": created,
        },
    ]
    payload["message_count"] = 2
    return payload


def _run_and_save(user, text: str, *, source: str = "Manual check"):
    ok, error_message = validate_somali_claim_input(text)
    if not ok:
        raise ValueError(error_message or "Invalid claim text.")

    result = predictor_service.classify_claim(text)
    message = _assistant_message(result)

    prediction = db_service.save_prediction(
        user_id=user.id,
        claim_text=text,
        is_medical=result["is_medical"],
        label=result["label"],
        label_confidence=result["label_confidence"],
        cleaned_text=result.get("cleaned_text"),
        source="non_medical" if not result["is_medical"] else source,
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
        details=f"Predicted claim as {label_text}",
        ip_address=_client_ip(),
        commit=False,
    )
    db.session.commit()

    return prediction, message, bool(result.get("enrichment_pending"))


@jwt_required()
def get_history():
    user = auth_service.get_user_by_id(get_jwt_identity())
    if not user:
        return jsonify({"error": True, "message": "User not found."}), 404
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 50, type=int)

    result = db_service.get_user_predictions(
        user.id,
        page=page,
        per_page=per_page,
        include_reviewed=user.is_healthcare_advisor,
    )
    return jsonify(result["items"]), 200


@jwt_required()
def create_conversation():
    """POST /api/history — classify with SomBERTb and return a chat conversation."""
    data = request.get_json(silent=True) or {}
    text = (data.get("input_text") or data.get("text") or data.get("content") or "").strip()
    if not text:
        return jsonify({"error": True, "message": "Text is required."}), 400

    user = auth_service.get_user_by_id(get_jwt_identity())
    if not user:
        return jsonify({"error": True, "message": "User not found."}), 404

    try:
        prediction, message, pending = _run_and_save(user, text)
    except ValueError as exc:
        return jsonify({"error": True, "message": str(exc)}), 400
    except RuntimeError as exc:
        return jsonify({"error": True, "message": str(exc)}), 503
    except FileNotFoundError as exc:
        return jsonify({"error": True, "message": str(exc)}), 503

    payload = _prediction_to_conversation(prediction, message)
    payload["enrichment_pending"] = pending
    return jsonify(payload), 201


@jwt_required()
def get_stats():
    user_id = int(get_jwt_identity())
    stats = db_service.get_user_dashboard_stats(user_id)
    return jsonify(stats), 200


@jwt_required()
def get_conversation(prediction_id: int):
    user = auth_service.get_user_by_id(get_jwt_identity())
    if not user:
        return jsonify({"error": True, "message": "User not found."}), 404

    prediction = Prediction.query.filter_by(
        id=prediction_id, user_id=user.id
    ).first()
    if not prediction:
        return jsonify({"error": True, "message": "Prediction not found."}), 404

    message = prediction.summary or predictor_service.build_message(
        prediction.source != "non_medical",
        prediction.label,
    )
    return jsonify(_prediction_to_conversation(prediction, message)), 200


@jwt_required()
def append_message(prediction_id: int):
    """POST /api/history/<id>/messages — treat follow-up as a new prediction chat."""
    data = request.get_json(silent=True) or {}
    text = (data.get("content") or data.get("input_text") or data.get("text") or "").strip()
    if not text:
        return jsonify({"error": True, "message": "Text is required."}), 400

    user = auth_service.get_user_by_id(get_jwt_identity())
    if not user:
        return jsonify({"error": True, "message": "User not found."}), 404

    parent = Prediction.query.filter_by(id=prediction_id, user_id=user.id).first()
    if not parent:
        return jsonify({"error": True, "message": "Prediction not found."}), 404

    try:
        prediction, message, pending = _run_and_save(user, text)
    except ValueError as exc:
        return jsonify({"error": True, "message": str(exc)}), 400
    except RuntimeError as exc:
        return jsonify({"error": True, "message": str(exc)}), 503
    except FileNotFoundError as exc:
        return jsonify({"error": True, "message": str(exc)}), 503

    payload = _prediction_to_conversation(prediction, message)
    payload["enrichment_pending"] = pending
    return jsonify(payload), 201


@jwt_required()
def edit_message(prediction_id: int, message_id: str):
    data = request.get_json(silent=True) or {}
    text = (data.get("content") or data.get("input_text") or data.get("text") or "").strip()
    if not text:
        return jsonify({"error": True, "message": "Text is required."}), 400

    ok, error_message = validate_somali_claim_input(text)
    if not ok:
        return jsonify({"error": True, "message": error_message}), 400

    user = auth_service.get_user_by_id(get_jwt_identity())
    if not user:
        return jsonify({"error": True, "message": "User not found."}), 404

    prediction = Prediction.query.filter_by(
        id=prediction_id, user_id=user.id
    ).first()
    if not prediction:
        return jsonify({"error": True, "message": "Prediction not found."}), 404

    try:
        result = predictor_service.classify_claim(text)
    except RuntimeError as exc:
        return jsonify({"error": True, "message": str(exc)}), 503

    message = _assistant_message(result)
    resolved_label = result["label"] or (
        "Non-medical" if not result["is_medical"] else "Pending"
    )
    conf = result["label_confidence"]
    resolved_confidence = float(conf) if conf is not None else 0.0
    if resolved_label == "Reliable":
        resolved_risk = "low"
    elif resolved_label in {"Non-Reliable", "Misinformation"}:
        resolved_risk = "high"
    else:
        resolved_risk = "none"

    prediction.claim_text = text
    prediction.cleaned_text = result.get("cleaned_text")
    prediction.label = resolved_label
    prediction.confidence = resolved_confidence
    prediction.label_confidence = conf
    prediction.source = (
        "non_medical" if not result["is_medical"] else (prediction.source or "pipeline")
    )
    prediction.summary = message
    prediction.risk = resolved_risk
    if resolved_label in {"Non-Reliable", "Misinformation"}:
        prediction.needs_review = True
        if prediction.review_status != "pending":
            prediction.review_status = "pending"
            prediction.advisor_id = None
            prediction.advisor_note = None
            prediction.corrected_claim_text = None
            prediction.reviewed_at = None
    else:
        prediction.needs_review = False
        if prediction.review_status == "pending":
            prediction.review_status = None
            prediction.advisor_id = None
            prediction.advisor_note = None
            prediction.corrected_claim_text = None
            prediction.reviewed_at = None

    audit_service.log_action(
        actor_id=user.id,
        actor_email=user.email,
        action="prediction.update",
        entity_type="prediction",
        entity_id=prediction.id,
        details=f"Edited prediction #{prediction.id}",
        ip_address=_client_ip(),
        commit=False,
    )
    db.session.commit()

    payload = _prediction_to_conversation(prediction, message)
    payload["enrichment_pending"] = bool(result.get("enrichment_pending"))
    return jsonify(payload), 200


@jwt_required()
def delete_history_item(prediction_id: int):
    user = auth_service.get_user_by_id(get_jwt_identity())
    if not user:
        return jsonify({"error": True, "message": "User not found."}), 404

    deleted = db_service.delete_prediction(user.id, prediction_id)
    if not deleted:
        return jsonify(
            {
                "error": True,
                "message": "Prediction not found.",
                "detail": "Prediction not found.",
            }
        ), 404

    audit_service.log_action(
        actor_id=user.id,
        actor_email=user.email,
        action="prediction.delete",
        entity_type="prediction",
        entity_id=prediction_id,
        details=f"Deleted prediction #{prediction_id}",
        ip_address=_client_ip(),
    )
    return "", 204
