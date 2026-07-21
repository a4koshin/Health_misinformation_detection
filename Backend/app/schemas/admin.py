import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class AdminUserCreate(BaseModel):
    email: EmailStr
    full_name: str | None = None
    password: str = Field(min_length=8, max_length=128)
    role: Literal["user", "admin"] = "user"


class AdminUserUpdate(BaseModel):
    email: EmailStr | None = None
    full_name: str | None = None
    password: str | None = Field(default=None, min_length=8, max_length=128)
    role: Literal["user", "admin"] | None = None


class AdminUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    full_name: str | None
    role: Literal["user", "admin"]
    created_at: datetime


class DashboardStats(BaseModel):
    total_users: int
    total_admins: int
    total_detections: int
    reliable_count: int
    misinformation_count: int
    pending_count: int


class DatasetPredictionRow(BaseModel):
    row: int
    text: str
    prediction: str | None = None
    error: str | None = None


class DatasetPredictionResponse(BaseModel):
    total_rows: int
    processed_rows: int
    reliable_count: int
    misinformation_count: int
    error_count: int
    results: list[DatasetPredictionRow]
