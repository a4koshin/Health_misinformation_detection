import os
import uuid
from pathlib import Path

from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename
from sqlalchemy import func

from extensions import db
from models.prediction import Prediction
from models.user import User
from services.user_validation import validate_email, validate_full_name

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

    next_email = validate_email(email)
    next_name = validate_full_name(name, required=True)

    clash = User.query.filter(User.email == next_email, User.id != user.id).first()
    if clash:
        raise ValueError("Email is already taken by another user.")

    user.email = next_email
    user.full_name = next_name
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


def request_account_deletion(user_id, password: str) -> User:
    from datetime import datetime, timezone

    user = get_user(user_id)
    if not user:
        raise LookupError("User not found.")
    if (user.role or "").strip().lower() == "admin":
        raise PermissionError("Admins cannot request account deletion.")
    if not user.is_active:
        raise ValueError("This account is already deactivated.")
    if not password:
        raise ValueError("Password is required to request account deletion.")
    if not user.check_password(password):
        raise ValueError("Password is incorrect.")
    if user.deletion_requested_at:
        return user

    user.deletion_requested_at = datetime.now(timezone.utc)
    db.session.commit()
    return user


def wipe_all_data(admin_id, password: str) -> dict:
    """Admin-only: delete all app data. Keeps the calling admin account."""
    from sqlalchemy import text
    from sqlalchemy.exc import IntegrityError

    from models.audit_log import AuditLog
    from models.notification import Notification
    from models.password_reset import PasswordReset

    admin = get_user(admin_id)
    if not admin:
        raise LookupError("User not found.")
    if (admin.role or "").strip().lower() != "admin":
        raise PermissionError("Admin access required.")
    if not password:
        raise ValueError("Password is required to wipe the database.")
    if not admin.check_password(password):
        raise ValueError("Password is incorrect.")

    # Clear dependent rows first so user deletes do not hit FK constraints.
    notifications_deleted = int(
        Notification.query.delete(synchronize_session=False) or 0
    )
    predictions_deleted = int(
        Prediction.query.delete(synchronize_session=False) or 0
    )
    password_resets_deleted = int(
        PasswordReset.query.delete(synchronize_session=False) or 0
    )
    audit_logs_deleted = int(
        AuditLog.query.delete(synchronize_session=False) or 0
    )

    doctors_deleted = 0
    try:
        from models.doctor import Doctor

        doctors_deleted = int(Doctor.query.delete(synchronize_session=False) or 0)
    except Exception:
        doctors_deleted = 0
        try:
            with db.session.begin_nested():
                result = db.session.execute(text("DELETE FROM doctors"))
                doctors_deleted = int(result.rowcount or 0)
        except Exception:
            doctors_deleted = 0

    upload_batches_deleted = 0
    try:
        with db.session.begin_nested():
            result = db.session.execute(text("DELETE FROM upload_batches"))
            upload_batches_deleted = int(result.rowcount or 0)
    except Exception:
        upload_batches_deleted = 0

    conversations_deleted = 0
    try:
        with db.session.begin_nested():
            result = db.session.execute(text("DELETE FROM conversations"))
            conversations_deleted = int(result.rowcount or 0)
    except Exception:
        conversations_deleted = 0

    other_users = User.query.filter(
        User.id != admin.id,
        func.lower(User.role) != "admin",
    ).all()
    users_deleted = 0
    for user in other_users:
        if user.avatar_url and user.avatar_url.startswith("/static/uploads/avatars/"):
            avatar_path = (
                Path(__file__).resolve().parent.parent / user.avatar_url.lstrip("/")
            )
            if avatar_path.exists() and avatar_path.is_file():
                try:
                    avatar_path.unlink()
                except OSError:
                    pass
        db.session.delete(user)
        users_deleted += 1

    try:
        db.session.commit()
    except IntegrityError as exc:
        db.session.rollback()
        raise ValueError(
            "Unable to wipe the database because related records remain. "
            "Try again after clearing notifications and user history."
        ) from exc

    return {
        "predictions_deleted": predictions_deleted,
        "users_deleted": users_deleted,
        "audit_logs_deleted": audit_logs_deleted,
        "password_resets_deleted": password_resets_deleted,
        "upload_batches_deleted": upload_batches_deleted,
        "notifications_deleted": notifications_deleted,
        "conversations_deleted": conversations_deleted,
    }
