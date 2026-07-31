import uuid

from sqlalchemy.orm import Session, joinedload

from app.models.chat_message import ChatMessage
from app.models.detection import Detection
from app.schemas.detection import (
    DetectionSummary,
    ReportRow,
    UserDashboardStats,
    UserReportResponse,
)
from app.services import detection_service
from app.services.chat_intent_service import (
    maybe_conversational_reply,
    validate_appropriate_input,
    validate_basic_input,
)
from app.services.input_validation_service import validate_somali_text


def build_label_reply(label: str, topic: str | None = None) -> str:
    """Prefer the shared Somali wrapper from detection_service."""
    return detection_service.build_response_message(label, topic)


def _is_prediction_reply(content: str) -> bool:
    text = content or ""
    return (
        "Waad ku mahadsantahay" in text
        or "Natiijadu waa" in text
        or text.startswith("Result:")
    )


def _classify_prediction_label(content: str) -> str | None:
    text = content or ""
    if "Non-Reliable" in text or "Misinformation" in text:
        return "Non-Reliable"
    if "Reliable" in text:
        return "Reliable"
    return None


def _extract_topic(content: str) -> str | None:
    lines = [line.strip() for line in (content or "").splitlines() if line.strip()]
    for index, line in enumerate(lines):
        if "mowduuca" in line.lower() and index + 1 < len(lines):
            topic = lines[index + 1].strip()
            if topic and topic not in {"Reliable", "Non-Reliable", "Misinformation"}:
                return topic
    return None


def get_user_dashboard_stats(
    db: Session,
    user_id: uuid.UUID,
) -> UserDashboardStats:
    """Count this user's predictions from assistant classification replies."""
    messages = (
        db.query(ChatMessage)
        .join(Detection, ChatMessage.detection_id == Detection.id)
        .filter(
            Detection.user_id == user_id,
            ChatMessage.role == "assistant",
        )
        .all()
    )

    total_predictions = 0
    reliable_count = 0
    non_reliable_count = 0

    for message in messages:
        if not _is_prediction_reply(message.content):
            continue
        total_predictions += 1
        label = _classify_prediction_label(message.content)
        if label == "Reliable":
            reliable_count += 1
        elif label == "Non-Reliable":
            non_reliable_count += 1

    chat_count = (
        db.query(Detection).filter(Detection.user_id == user_id).count()
    )

    return UserDashboardStats(
        total_predictions=total_predictions,
        reliable_count=reliable_count,
        non_reliable_count=non_reliable_count,
        chat_count=chat_count,
    )


def get_user_report(db: Session, user_id: uuid.UUID) -> UserReportResponse:
    """Build a downloadable prediction report for one user."""
    detections = (
        db.query(Detection)
        .options(joinedload(Detection.messages))
        .filter(Detection.user_id == user_id)
        .order_by(Detection.created_at.desc())
        .all()
    )

    rows: list[ReportRow] = []
    reliable_count = 0
    non_reliable_count = 0

    for detection in detections:
        messages = sorted(
            detection.messages,
            key=lambda message: (
                message.created_at,
                0 if message.role == "user" else 1,
                str(message.id),
            ),
        )

        pending_claim: str | None = None
        for message in messages:
            if message.role == "user":
                pending_claim = message.content.strip()
                continue

            if message.role != "assistant" or not pending_claim:
                continue
            if not _is_prediction_reply(message.content):
                pending_claim = None
                continue

            label = _classify_prediction_label(message.content)
            topic = _extract_topic(message.content) if label == "Reliable" else None
            if label == "Reliable":
                reliable_count += 1
            elif label == "Non-Reliable":
                non_reliable_count += 1

            rows.append(
                ReportRow(
                    conversation_id=detection.id,
                    claim=pending_claim,
                    label=label,
                    topic=topic,
                    created_at=message.created_at,
                )
            )
            pending_claim = None

        # Legacy detections with a label but no chat-message pairs yet.
        if not any(
            row.conversation_id == detection.id for row in rows
        ) and detection.label:
            label = detection.label
            if label == "Misinformation":
                label = "Non-Reliable"
            if label == "Reliable":
                reliable_count += 1
            elif label == "Non-Reliable":
                non_reliable_count += 1
            rows.append(
                ReportRow(
                    conversation_id=detection.id,
                    claim=detection.input_text.strip(),
                    label=label,
                    topic=None,
                    created_at=detection.created_at,
                )
            )

    return UserReportResponse(
        total_rows=len(rows),
        reliable_count=reliable_count,
        non_reliable_count=non_reliable_count,
        rows=rows,
    )


def build_user_report_csv(report: UserReportResponse) -> str:
    """Serialize the user report as CSV text."""
    import csv
    import io

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        ["claim", "label", "topic", "created_at", "conversation_id"]
    )
    for row in report.rows:
        writer.writerow(
            [
                row.claim,
                row.label or "",
                row.topic or "",
                row.created_at.isoformat(),
                str(row.conversation_id),
            ]
        )
    return buffer.getvalue()


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
    result = detection_service.predict_detailed(stripped, skip_validation=True)
    label = str(result["label"])
    return result["message"], label, "classified"


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
