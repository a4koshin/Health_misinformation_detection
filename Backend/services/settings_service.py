import os
import uuid
from pathlib import Path

from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename

from extensions import db
from models.prediction import Prediction
from models.user import User
from services.user_cleanup import purge_user_dependencies

ALLOWED_AVATAR_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
MAX_AVATAR_BYTES = 2 * 1024 * 1024  # 2MB
AVATAR_UPLOAD_DIR = Path(__file__).resolve().parent.parent / "static" / "uploads" / "avatars"


def get_user(user_id) -> User | None:
    try:
        return db.session.get(User, int(user_id))
    except (TypeError, ValueError):
        return None


def update_profile(user_id, name: str | None, email: str | None) -> User:
    user = get_user(user_id)
    if not user:
        raise LookupError("User not found.")

    next_email = (email or "").strip().lower()
    if not next_email:
        raise ValueError("Email is required.")

    clash = User.query.filter(User.email == next_email, User.id != user.id).first()
    if clash:
        raise ValueError("Email is already taken by another user.")

    user.email = next_email
    user.full_name = (name or "").strip() or None
    db.session.commit()
    return user


def change_password(user_id, current_password: str, new_password: str) -> User:
    user = get_user(user_id)
    if not user:
        raise LookupError("User not found.")

    if not current_password or not new_password:
        raise ValueError("Current password and new password are required.")
    if not user.check_password(current_password):
        raise ValueError("Current password is incorrect.")
    if len(new_password) < 6:
        raise ValueError("New password must be at least 6 characters.")
    if current_password == new_password:
        raise ValueError("New password must be different from the current password.")

    user.set_password(new_password)
    db.session.commit()
    return user


def update_language(user_id, language: str) -> User:
    user = get_user(user_id)
    if not user:
        raise LookupError("User not found.")

    value = (language or "").strip().lower()
    if value not in {"so", "en"}:
        raise ValueError("Language must be 'so' or 'en'.")

    user.language_preference = value
    db.session.commit()
    return user


def upload_avatar(user_id, file: FileStorage | None) -> User:
    user = get_user(user_id)
    if not user:
        raise LookupError("User not found.")

    if not file or not file.filename:
        raise ValueError("No image file was uploaded.")

    filename = secure_filename(file.filename)
    extension = Path(filename).suffix.lower()
    if extension not in ALLOWED_AVATAR_EXTENSIONS:
        raise ValueError("Only image files are allowed (jpg, png, gif, webp).")

    # Size check — FileStorage may not always expose content_length.
    file.stream.seek(0, os.SEEK_END)
    size = file.stream.tell()
    file.stream.seek(0)
    if size > MAX_AVATAR_BYTES:
        raise ValueError("Avatar must be 2MB or smaller.")

    AVATAR_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    stored_name = f"user_{user.id}_{uuid.uuid4().hex}{extension}"
    destination = AVATAR_UPLOAD_DIR / stored_name
    file.save(destination)

    # Remove previous local avatar if it lived in our uploads folder.
    if user.avatar_url and user.avatar_url.startswith("/static/uploads/avatars/"):
        old_path = Path(__file__).resolve().parent.parent / user.avatar_url.lstrip("/")
        if old_path.exists() and old_path.is_file():
            try:
                old_path.unlink()
            except OSError:
                pass

    user.avatar_url = f"/static/uploads/avatars/{stored_name}"
    db.session.commit()
    return user


def delete_history(user_id) -> int:
    user = get_user(user_id)
    if not user:
        raise LookupError("User not found.")

    deleted = Prediction.query.filter_by(user_id=user.id).delete(
        synchronize_session=False
    )
    db.session.commit()
    return int(deleted or 0)


def delete_account(user_id) -> None:
    user = get_user(user_id)
    if not user:
        raise LookupError("User not found.")

    if user.avatar_url and user.avatar_url.startswith("/static/uploads/avatars/"):
        avatar_path = (
            Path(__file__).resolve().parent.parent / user.avatar_url.lstrip("/")
        )
        if avatar_path.exists() and avatar_path.is_file():
            try:
                avatar_path.unlink()
            except OSError:
                pass

    purge_user_dependencies(user.id)
    db.session.delete(user)
    db.session.commit()
