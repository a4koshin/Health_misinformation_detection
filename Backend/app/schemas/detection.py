import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class DetectionCreate(BaseModel):
    input_text: str = Field(min_length=1, max_length=10000)


class MessageCreate(BaseModel):
    content: str = Field(min_length=1, max_length=10000)


class MessageUpdate(BaseModel):
    content: str = Field(min_length=1, max_length=10000)


class DetectionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    input_text: str
    label: str | None
    confidence: float | None
    somali_status: str
    created_at: datetime


class DetectionSummary(DetectionResponse):
    message_count: int


class ChatMessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    role: str
    content: str
    created_at: datetime


class ConversationResponse(DetectionResponse):
    messages: list[ChatMessageResponse]
