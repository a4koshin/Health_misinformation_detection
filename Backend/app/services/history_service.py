import uuid

from sqlalchemy.orm import Session, joinedload

from app.models.chat_message import ChatMessage
from app.models.detection import Detection
from app.schemas.detection import DetectionSummary


def build_assistant_reply(user_message: str) -> str:
    preview = user_message.strip()
    if len(preview) > 120:
        preview = f"{preview[:120]}…"

    return (
        "Thanks for sharing that claim. I would review the wording, check trusted health sources, "
        "and compare it with current medical guidance before treating it as reliable. "
        f'For now this is a preview response for: "{preview}"'
    )


def build_label_reply(label: str, confidence: float | None) -> str:
    readable_label = label.replace("_", " ")
    if confidence is None:
        return f"Result: {readable_label}."
    return f"Result: {readable_label} ({round(confidence * 100)}% confidence)."


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
    assistant_content = (
        build_label_reply(detection.label, detection.confidence)
        if detection.label
        else build_assistant_reply(detection.input_text)
    )
    assistant_message = ChatMessage(
        detection_id=detection.id,
        role="assistant",
        content=assistant_content,
    )
    db.add_all([user_message, assistant_message])
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
    content = input_text.strip()
    detection = Detection(
        user_id=user_id,
        input_text=content,
        label=None,
        confidence=None,
        somali_status="pending",
    )
    db.add(detection)
    db.flush()

    user_message = ChatMessage(
        detection_id=detection.id,
        role="user",
        content=content,
    )
    assistant_message = ChatMessage(
        detection_id=detection.id,
        role="assistant",
        content=build_assistant_reply(content),
    )
    db.add_all([user_message, assistant_message])
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

    trimmed = content.strip()
    user_message = ChatMessage(
        detection_id=detection.id,
        role="user",
        content=trimmed,
    )
    assistant_message = ChatMessage(
        detection_id=detection.id,
        role="assistant",
        content=build_assistant_reply(trimmed),
    )
    db.add_all([user_message, assistant_message])
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

    messages = sorted(detection.messages, key=lambda message: message.created_at)
    target = next((message for message in messages if message.id == message_id), None)
    if target is None or target.role != "user":
        return None

    trimmed = content.strip()
    if not trimmed:
        return None

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

    assistant_message = ChatMessage(
        detection_id=detection.id,
        role="assistant",
        content=build_assistant_reply(trimmed),
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
