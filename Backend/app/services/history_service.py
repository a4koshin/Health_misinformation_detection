import uuid

from sqlalchemy.orm import Session, joinedload

from app.models.chat_message import ChatMessage
from app.models.detection import Detection
from app.schemas.detection import DetectionSummary
from app.services import detection_service
from app.services.chat_intent_service import (
    maybe_conversational_reply,
    validate_appropriate_input,
    validate_basic_input,
)
from app.services.input_validation_service import validate_somali_text


def build_label_reply(label: str) -> str:
    return f"Result: {label}."


def resolve_user_message(text: str) -> tuple[str, str | None, str]:
    """
    Validate first, answer chat intents without the model, otherwise predict.

    Returns (assistant_content, label|None, somali_status).
    """
    stripped = validate_basic_input(text)
    validate_appropriate_input(stripped)

    conversational = maybe_conversational_reply(stripped)
    if conversational:
        return conversational, None, "chat"

    validate_somali_text(stripped)
    label = detection_service.predict(stripped, skip_validation=True)
    return build_label_reply(label), label, "classified"


def get_user_detections(db: Session, user_id: uuid.UUID) -> list[DetectionSummary]:
    detections = (
        db.query(Detection)
        .options(joinedload(Detection.messages))
        .filter(Detection.user_id == user_id)
        .order_by(Detection.created_at.desc())
        .all()
    )

    summaries: list[DetectionSummary] = []
    for detection in detections:
        message_count = len(detection.messages)
        if message_count == 0:
            message_count = 1

        summaries.append(
            DetectionSummary(
                id=detection.id,
                user_id=detection.user_id,
                input_text=detection.input_text,
                label=detection.label,
                confidence=detection.confidence,
                somali_status=detection.somali_status,
                created_at=detection.created_at,
                message_count=message_count,
            )
        )

    return summaries


def _ensure_legacy_messages(db: Session, detection: Detection) -> None:
    if detection.messages:
        return

    user_message = ChatMessage(
        detection_id=detection.id,
        role="user",
        content=detection.input_text,
    )
    db.add(user_message)
    db.flush()

    if detection.label:
        assistant_content = build_label_reply(detection.label)
    else:
        assistant_content, label, somali_status = resolve_user_message(
            detection.input_text
        )
        detection.label = label
        detection.confidence = None
        detection.somali_status = somali_status

    assistant_message = ChatMessage(
        detection_id=detection.id,
        role="assistant",
        content=assistant_content,
    )
    db.add(assistant_message)
    db.commit()
    db.refresh(detection)


def get_conversation(
    db: Session,
    user_id: uuid.UUID,
    detection_id: uuid.UUID,
) -> Detection | None:
    detection = (
        db.query(Detection)
        .options(joinedload(Detection.messages))
        .filter(Detection.id == detection_id, Detection.user_id == user_id)
        .first()
    )
    if detection is None:
        return None

    if not detection.messages:
        _ensure_legacy_messages(db, detection)
        detection = (
            db.query(Detection)
            .options(joinedload(Detection.messages))
            .filter(Detection.id == detection_id, Detection.user_id == user_id)
            .first()
        )

    return detection


def create_conversation(
    db: Session,
    user_id: uuid.UUID,
    input_text: str,
) -> Detection:
    assistant_content, label, somali_status = resolve_user_message(input_text)
    content = input_text.strip()

    detection = Detection(
        user_id=user_id,
        input_text=content,
        label=label,
        confidence=None,
        somali_status=somali_status,
    )
    db.add(detection)
    db.flush()

    user_message = ChatMessage(
        detection_id=detection.id,
        role="user",
        content=content,
    )
    db.add(user_message)
    db.flush()

    assistant_message = ChatMessage(
        detection_id=detection.id,
        role="assistant",
        content=assistant_content,
    )
    db.add(assistant_message)
    db.commit()

    return get_conversation(db, user_id, detection.id)


def append_message(
    db: Session,
    user_id: uuid.UUID,
    detection_id: uuid.UUID,
    content: str,
) -> Detection | None:
    detection = get_conversation(db, user_id, detection_id)
    if detection is None:
        return None

    assistant_content, label, somali_status = resolve_user_message(content)
    trimmed = content.strip()

    detection.label = label
    detection.confidence = None
    detection.somali_status = somali_status

    user_message = ChatMessage(
        detection_id=detection.id,
        role="user",
        content=trimmed,
    )
    db.add(user_message)
    db.flush()

    assistant_message = ChatMessage(
        detection_id=detection.id,
        role="assistant",
        content=assistant_content,
    )
    db.add(assistant_message)
    db.commit()

    return get_conversation(db, user_id, detection.id)


def edit_message(
    db: Session,
    user_id: uuid.UUID,
    detection_id: uuid.UUID,
    message_id: uuid.UUID,
    content: str,
) -> Detection | None:
    detection = get_conversation(db, user_id, detection_id)
    if detection is None:
        return None

    messages = sorted(
        detection.messages,
        key=lambda message: (
            message.created_at,
            0 if message.role == "user" else 1,
            str(message.id),
        ),
    )
    target = next((message for message in messages if message.id == message_id), None)
    if target is None or target.role != "user":
        return None

    assistant_content, label, somali_status = resolve_user_message(content)
    trimmed = content.strip()

    target_index = messages.index(target)
    for message in messages[target_index + 1 :]:
        db.delete(message)

    target.content = trimmed

    first_user_message = next(
        (message for message in messages if message.role == "user"),
        None,
    )
    if first_user_message and first_user_message.id == target.id:
        detection.input_text = trimmed

    detection.label = label
    detection.confidence = None
    detection.somali_status = somali_status

    assistant_message = ChatMessage(
        detection_id=detection.id,
        role="assistant",
        content=assistant_content,
    )
    db.add(assistant_message)
    db.commit()

    return get_conversation(db, user_id, detection.id)


def delete_conversation(
    db: Session,
    user_id: uuid.UUID,
    detection_id: uuid.UUID,
) -> bool:
    detection = (
        db.query(Detection)
        .filter(Detection.id == detection_id, Detection.user_id == user_id)
        .first()
    )
    if detection is None:
        return False

    db.delete(detection)
    db.commit()
    return True
