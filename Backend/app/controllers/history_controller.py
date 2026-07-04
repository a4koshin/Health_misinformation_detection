import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.controllers.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.detection import (
    ConversationResponse,
    DetectionCreate,
    DetectionSummary,
    MessageCreate,
)
from app.services import history_service

router = APIRouter(prefix="/api/history", tags=["history"])


@router.get("", response_model=list[DetectionSummary])
def get_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[DetectionSummary]:
    return history_service.get_user_detections(db, current_user.id)


@router.get("/{detection_id}", response_model=ConversationResponse)
def get_conversation(
    detection_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ConversationResponse:
    conversation = history_service.get_conversation(db, current_user.id, detection_id)
    if conversation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found")
    return conversation


@router.post("", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
def create_history_item(
    data: DetectionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ConversationResponse:
    return history_service.create_conversation(db, current_user.id, data.input_text)


@router.post("/{detection_id}/messages", response_model=ConversationResponse)
def append_history_message(
    detection_id: uuid.UUID,
    data: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ConversationResponse:
    conversation = history_service.append_message(
        db,
        current_user.id,
        detection_id,
        data.content,
    )
    if conversation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found")
    return conversation


@router.delete("/{detection_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_history_item(
    detection_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    deleted = history_service.delete_conversation(db, current_user.id, detection_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found")
