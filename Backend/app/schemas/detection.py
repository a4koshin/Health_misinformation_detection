import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DetectionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    input_text: str
    label: str | None
    confidence: float | None
    somali_status: str
    created_at: datetime
