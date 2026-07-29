from fastapi import APIRouter, Depends

from app.controllers.deps import get_current_user
from app.models.user import User
from app.schemas.prediction import PredictRequest, PredictResponse
from app.services import detection_service

router = APIRouter(tags=["prediction"])


@router.post("/predict", response_model=PredictResponse)
def predict_text(
    data: PredictRequest,
    current_user: User = Depends(get_current_user),
) -> PredictResponse:
    result = detection_service.predict_detailed(data.text)
    return PredictResponse(
        prediction=result["label"],
        confidence=result["confidence"],
        topic=result["topic"],
        topic_confidence=result["topic_confidence"],
        message=result["message"],
    )
