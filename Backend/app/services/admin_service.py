import csv
import io
import uuid

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.detection import Detection
from app.models.user import User
from app.schemas.admin import (
    AdminUserCreate,
    AdminUserUpdate,
    DashboardStats,
    DatasetPredictionResponse,
    DatasetPredictionRow,
)
from app.services import auth_service, detection_service


class UserNotFoundError(Exception):
    pass


class LastAdminError(Exception):
    pass


def list_users(db: Session) -> list[User]:
    return db.query(User).order_by(User.created_at.desc()).all()


def create_user(db: Session, data: AdminUserCreate) -> User:
    if auth_service.get_user_by_email(db, data.email):
        raise auth_service.EmailAlreadyRegisteredError()

    user = User(
        email=data.email,
        full_name=data.full_name,
        hashed_password=hash_password(data.password),
        role=data.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_user(
    db: Session,
    user_id: uuid.UUID,
    data: AdminUserUpdate,
    current_admin: User,
) -> User:
    user = auth_service.get_user_by_id(db, user_id)
    if user is None:
        raise UserNotFoundError()

    if data.email is not None and data.email != user.email:
        if auth_service.get_user_by_email(db, data.email):
            raise auth_service.EmailAlreadyRegisteredError()
        user.email = data.email

    if "full_name" in data.model_fields_set:
        user.full_name = data.full_name

    if data.password:
        user.hashed_password = hash_password(data.password)

    if data.role is not None and data.role != user.role:
        if user.role == "admin" and data.role != "admin":
            _ensure_another_admin_exists(db, user.id)
        user.role = data.role

    db.add(user)
    db.commit()
    db.refresh(user)

    if user.id == current_admin.id:
        db.refresh(current_admin)

    return user


def delete_user(
    db: Session,
    user_id: uuid.UUID,
    current_admin: User,
) -> None:
    user = auth_service.get_user_by_id(db, user_id)
    if user is None:
        raise UserNotFoundError()

    if user.id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account.",
        )

    if user.role == "admin":
        _ensure_another_admin_exists(db, user.id)

    db.delete(user)
    db.commit()


def get_dashboard_stats(db: Session) -> DashboardStats:
    total_users = db.query(func.count(User.id)).scalar() or 0
    total_admins = (
        db.query(func.count(User.id)).filter(User.role == "admin").scalar() or 0
    )
    total_detections = db.query(func.count(Detection.id)).scalar() or 0
    reliable_count = (
        db.query(func.count(Detection.id))
        .filter(Detection.label == "Reliable")
        .scalar()
        or 0
    )
    misinformation_count = (
        db.query(func.count(Detection.id))
        .filter(Detection.label == "Misinformation")
        .scalar()
        or 0
    )
    pending_count = (
        db.query(func.count(Detection.id))
        .filter(Detection.label.is_(None))
        .scalar()
        or 0
    )

    return DashboardStats(
        total_users=total_users,
        total_admins=total_admins,
        total_detections=total_detections,
        reliable_count=reliable_count,
        misinformation_count=misinformation_count,
        pending_count=pending_count,
    )


def predict_dataset(file_bytes: bytes, filename: str) -> DatasetPredictionResponse:
    if not filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV files are supported.",
        )

    try:
        decoded = file_bytes.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CSV file must be UTF-8 encoded.",
        ) from exc

    reader = csv.DictReader(io.StringIO(decoded))
    if not reader.fieldnames:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CSV file is empty or missing a header row.",
        )

    normalized_headers = {
        header.strip().lower(): header for header in reader.fieldnames if header
    }
    text_header = next(
        (
            normalized_headers[key]
            for key in ("text", "input_text", "claim", "sentence")
            if key in normalized_headers
        ),
        None,
    )
    if text_header is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CSV must include a text column named text, input_text, claim, or sentence.",
        )

    results: list[DatasetPredictionRow] = []
    reliable_count = 0
    misinformation_count = 0
    error_count = 0

    for index, row in enumerate(reader, start=2):
        raw_text = (row.get(text_header) or "").strip()
        if not raw_text:
            error_count += 1
            results.append(
                DatasetPredictionRow(
                    row=index,
                    text="",
                    error="Empty text cell.",
                )
            )
            continue

        try:
            prediction = detection_service.predict(raw_text)
            if prediction == "Reliable":
                reliable_count += 1
            elif prediction == "Misinformation":
                misinformation_count += 1
            results.append(
                DatasetPredictionRow(
                    row=index,
                    text=raw_text,
                    prediction=prediction,
                )
            )
        except HTTPException as exc:
            error_count += 1
            results.append(
                DatasetPredictionRow(
                    row=index,
                    text=raw_text,
                    error=str(exc.detail),
                )
            )

    return DatasetPredictionResponse(
        total_rows=len(results),
        processed_rows=len(results) - error_count,
        reliable_count=reliable_count,
        misinformation_count=misinformation_count,
        error_count=error_count,
        results=results,
    )


def _ensure_another_admin_exists(db: Session, user_id: uuid.UUID) -> None:
    remaining_admins = (
        db.query(func.count(User.id))
        .filter(User.role == "admin", User.id != user_id)
        .scalar()
        or 0
    )
    if remaining_admins == 0:
        raise LastAdminError()
