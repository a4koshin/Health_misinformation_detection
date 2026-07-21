import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr


class UserRegister(BaseModel):
    email: EmailStr
    full_name: str | None = None
    password: str


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    full_name: str | None
    role: Literal["user", "admin"]
    created_at: datetime


class UserProfileUpdate(BaseModel):
    email: EmailStr | None = None
    full_name: str | None = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    password: str


class MessageResponse(BaseModel):
    message: str
