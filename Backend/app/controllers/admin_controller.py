import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.controllers.deps import get_current_admin
from app.core.database import get_db
from app.models.user import User
from app.schemas.admin import (
    AdminUserCreate,
    AdminUserResponse,
    AdminUserUpdate,
    DashboardStats,
    DatasetPredictionResponse,
)
from app.services import admin_service, auth_service

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/dashboard", response_model=DashboardStats)
def get_dashboard(
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> DashboardStats:
    return admin_service.get_dashboard_stats(db)


@router.get("/users", response_model=list[AdminUserResponse])
def list_users(
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> list[User]:
    return admin_service.list_users(db)


@router.post(
    "/users",
    response_model=AdminUserResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_user(
    data: AdminUserCreate,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> User:
    try:
        return admin_service.create_user(db, data)
    except auth_service.EmailAlreadyRegisteredError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        ) from None


@router.patch("/users/{user_id}", response_model=AdminUserResponse)
def update_user(
    user_id: uuid.UUID,
    data: AdminUserUpdate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> User:
    try:
        return admin_service.update_user(db, user_id, data, current_admin)
    except admin_service.UserNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        ) from None
    except auth_service.EmailAlreadyRegisteredError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        ) from None
    except admin_service.LastAdminError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one administrator must remain.",
        ) from None


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: uuid.UUID,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> None:
    try:
        admin_service.delete_user(db, user_id, current_admin)
    except admin_service.UserNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        ) from None
    except admin_service.LastAdminError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one administrator must remain.",
        ) from None


@router.post("/dataset/predict", response_model=DatasetPredictionResponse)
async def predict_dataset(
    file: UploadFile = File(...),
    _: User = Depends(get_current_admin),
) -> DatasetPredictionResponse:
    content = await file.read()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    return admin_service.predict_dataset(content, file.filename or "dataset.csv")
