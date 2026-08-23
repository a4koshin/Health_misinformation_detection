"""Admin-only doctor accounts and professional profiles."""

from __future__ import annotations

import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy.exc import IntegrityError
from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename

from extensions import db
from models.doctor import Doctor
from models.user import User
from services import admin_service, auth_service
from services.user_validation import validate_email, validate_full_name

BASE_UPLOAD_DIR = Path(__file__).resolve().parent.parent / "static" / "uploads"
LICENSE_UPLOAD_DIR = BASE_UPLOAD_DIR / "doctor_licenses"
PROFILE_UPLOAD_DIR = BASE_UPLOAD_DIR / "doctor_profiles"

ALLOWED_LICENSE_EXTENSIONS = {".pdf"}
ALLOWED_PROFILE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
MAX_UPLOAD_BYTES = 5 * 1024 * 1024  # 5MB
PROFILE_MIME_PREFIX = "image/"
LICENSE_MIME_TYPES = {"application/pdf"}


def _extension(filename: str | None) -> str:
    return Path(secure_filename(filename or "")).suffix.lower()


def _validate_upload_type(
    *,
    file: FileStorage | None,
    allowed: set[str],
    label: str,
    allowed_mimes: set[str] | None = None,
    mime_prefix: str | None = None,
) -> None:
    if not file or not file.filename:
        raise ValueError(f"{label} file is required.")
    extension = _extension(file.filename)
    if extension not in allowed:
        allowed_list = ", ".join(sorted(ext.lstrip(".").upper() for ext in allowed))
        raise ValueError(f"{label} must be a {allowed_list} file.")
    content_type = (file.mimetype or "").strip().lower()
    if mime_prefix and content_type and not content_type.startswith(mime_prefix):
        raise ValueError(f"{label} must be an image file.")
    if allowed_mimes and content_type and content_type not in allowed_mimes:
        raise ValueError(f"{label} must be a PDF document.")


def _require_text(value: str | None, label: str, *, max_len: int = 180) -> str:
    text = (value or "").strip()
    if not text:
        raise ValueError(f"{label} is required.")
    if len(text) > max_len:
        raise ValueError(f"{label} must be at most {max_len} characters.")
    return text


def _delete_local_upload(url: str | None) -> None:
    if not url or not url.startswith("/static/uploads/"):
        return
    path = Path(__file__).resolve().parent.parent / url.lstrip("/")
    if path.exists() and path.is_file():
        try:
            path.unlink()
        except OSError:
            pass


def _save_upload(
    *,
    file: FileStorage | None,
    directory: Path,
    allowed: set[str],
    prefix: str,
    label: str,
    allowed_mimes: set[str] | None = None,
    mime_prefix: str | None = None,
) -> str:
    _validate_upload_type(
        file=file,
        allowed=allowed,
        label=label,
        allowed_mimes=allowed_mimes,
        mime_prefix=mime_prefix,
    )
    assert file is not None and file.filename

    filename = secure_filename(file.filename)
    extension = Path(filename).suffix.lower()

    file.stream.seek(0, os.SEEK_END)
    size = file.stream.tell()
    file.stream.seek(0)
    if size <= 0:
        raise ValueError(f"{label} file is empty.")
    if size > MAX_UPLOAD_BYTES:
        raise ValueError(f"{label} must be 5MB or smaller.")

    directory.mkdir(parents=True, exist_ok=True)
    stored_name = f"{prefix}_{uuid.uuid4().hex}{extension}"
    destination = directory / stored_name
    file.save(destination)

    relative = directory.relative_to(Path(__file__).resolve().parent.parent)
    return f"/{relative.as_posix()}/{stored_name}"


def list_doctors() -> list[dict]:
    rows = (
        db.session.query(Doctor, User)
        .join(User, Doctor.user_id == User.id)
        .order_by(Doctor.created_at.desc())
        .all()
    )
    return [doctor.to_dict(user=user) for doctor, user in rows]


def create_doctor(
    *,
    email: str,
    password: str,
    name: str,
    job_title: str,
    workplace: str,
    license_file: FileStorage | None,
    profile_image_file: FileStorage | None,
) -> dict:
    email = validate_email(email)
    display_name = validate_full_name(name, required=True)
    if not password:
        raise ValueError("Password is required.")
    if len(password) < 6:
        raise ValueError("Password must be at least 6 characters.")

    title = _require_text(job_title, "Job title", max_len=120)
    work = _require_text(workplace, "Workplace", max_len=180)

    if User.query.filter_by(email=email).first():
        raise ValueError("Email is already registered.")

    license_url = _save_upload(
        file=license_file,
        directory=LICENSE_UPLOAD_DIR,
        allowed=ALLOWED_LICENSE_EXTENSIONS,
        prefix="license",
        label="License",
        allowed_mimes=LICENSE_MIME_TYPES,
    )
    profile_url = _save_upload(
        file=profile_image_file,
        directory=PROFILE_UPLOAD_DIR,
        allowed=ALLOWED_PROFILE_EXTENSIONS,
        prefix="profile",
        label="Profile image",
        mime_prefix=PROFILE_MIME_PREFIX,
    )

    user = User(
        email=email,
        full_name=display_name,
        role="doctor",
        advisor_since=datetime.now(timezone.utc),
        avatar_url=profile_url,
    )
    user.set_password(password)
    db.session.add(user)
    db.session.flush()

    doctor = Doctor(
        user_id=user.id,
        name=display_name or "",
        license=license_url,
        profile_image=profile_url,
        job_title=title,
        workplace=work,
    )
    db.session.add(doctor)
    try:
        db.session.commit()
    except IntegrityError as exc:
        db.session.rollback()
        _delete_local_upload(license_url)
        _delete_local_upload(profile_url)
        raise ValueError("Unable to create doctor account.") from exc

    return doctor.to_dict(user=user)


def update_doctor(
    *,
    doctor_id: int,
    email: str | None = None,
    name: str | None = None,
    job_title: str | None = None,
    workplace: str | None = None,
    password: str | None = None,
    update_name: bool = False,
    license_file: FileStorage | None = None,
    profile_image_file: FileStorage | None = None,
) -> dict:
    doctor = db.session.get(Doctor, doctor_id)
    if not doctor:
        raise LookupError("Doctor not found.")

    user = auth_service.get_user_by_id(doctor.user_id)
    if not user:
        raise LookupError("Doctor account not found.")

    if email is not None:
        next_email = validate_email(email)
        clash = User.query.filter(User.email == next_email, User.id != user.id).first()
        if clash:
            raise ValueError("Email is already registered.")
        user.email = next_email

    if update_name:
        display_name = validate_full_name(name, required=True)
        user.full_name = display_name
        doctor.name = display_name or doctor.name

    if job_title is not None:
        doctor.job_title = _require_text(job_title, "Job title", max_len=120)
    if workplace is not None:
        doctor.workplace = _require_text(workplace, "Workplace", max_len=180)

    if password:
        if len(password) < 6:
            raise ValueError("Password must be at least 6 characters.")
        user.set_password(password)

    if license_file is not None and license_file.filename:
        new_license = _save_upload(
            file=license_file,
            directory=LICENSE_UPLOAD_DIR,
            allowed=ALLOWED_LICENSE_EXTENSIONS,
            prefix=f"license_{doctor.id}",
            label="License",
            allowed_mimes=LICENSE_MIME_TYPES,
        )
        _delete_local_upload(doctor.license)
        doctor.license = new_license

    if profile_image_file is not None and profile_image_file.filename:
        new_profile = _save_upload(
            file=profile_image_file,
            directory=PROFILE_UPLOAD_DIR,
            allowed=ALLOWED_PROFILE_EXTENSIONS,
            prefix=f"profile_{doctor.id}",
            label="Profile image",
            mime_prefix=PROFILE_MIME_PREFIX,
        )
        _delete_local_upload(doctor.profile_image)
        if user.avatar_url == doctor.profile_image:
            _delete_local_upload(user.avatar_url)
        doctor.profile_image = new_profile
        user.avatar_url = new_profile

    if (user.role or "").lower() in {"healthcare_advisor", "doctor"}:
        user.role = "doctor"
        if not user.advisor_since:
            user.advisor_since = datetime.now(timezone.utc)

    doctor.updated_at = datetime.now(timezone.utc)
    db.session.commit()
    return doctor.to_dict(user=user)


def delete_doctor(*, doctor_id: int, actor_id: int) -> dict:
    doctor = db.session.get(Doctor, doctor_id)
    if not doctor:
        raise LookupError("Doctor not found.")

    license_url = doctor.license
    profile_url = doctor.profile_image
    user_id = doctor.user_id
    result = admin_service.hard_delete_user(user_id=user_id, actor_id=actor_id)
    _delete_local_upload(license_url)
    _delete_local_upload(profile_url)
    return {
        "id": str(doctor_id),
        "user_id": result["id"],
        "email": result["email"],
    }


def delete_doctor_for_user(user_id: int) -> None:
    doctor = Doctor.query.filter_by(user_id=user_id).first()
    if doctor:
        _delete_local_upload(doctor.license)
        _delete_local_upload(doctor.profile_image)
        db.session.delete(doctor)
