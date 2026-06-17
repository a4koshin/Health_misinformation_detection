from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.controllers.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.detection import DetectionResponse
from app.services import history_service

router = APIRouter(prefix="/api/history", tags=["history"])


@router.get("", response_model=list[DetectionResponse])
def get_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[DetectionResponse]:
    return history_service.get_user_detections(db, current_user.id)
