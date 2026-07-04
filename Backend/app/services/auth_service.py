import logging
import uuid

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import (
    create_password_reset_token,
    decode_password_reset_token,
    hash_password,
    verify_password,
)
from app.models.user import User
from app.schemas.auth import UserRegister
from app.services import email_service

logger = logging.getLogger(__name__)

class EmailAlreadyRegisteredError(Exception):
    pass


class InvalidCredentialsError(Exception):
    pass


class InvalidResetTokenError(Exception):
    pass


class PasswordResetEmailError(Exception):
    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message

FORGOT_PASSWORD_MESSAGE = (
    "If an account exists for that email, password reset instructions have been sent."
)

def get_user_by_id(db: Session, user_id: uuid.UUID) -> User | None:
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email).first()


def register_user(db: Session, data: UserRegister) -> User:
    if get_user_by_email(db, data.email):
        raise EmailAlreadyRegisteredError()

    user = User(
        email=data.email,
        full_name=data.full_name,
        hashed_password=hash_password(data.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> User:
    user = get_user_by_email(db, email)
    if user is None or not verify_password(password, user.hashed_password):
        raise InvalidCredentialsError()
    return user


def request_password_reset(db: Session, email: str) -> None:
    user = get_user_by_email(db, email)
    if user is None:
        return

    token = create_password_reset_token(str(user.id))
    reset_url = f"{settings.frontend_origin.rstrip('/')}/reset-password?token={token}"

    try:
        email_service.send_password_reset_email(user.email, reset_url)
        logger.info("Password reset email sent to %s", email)
    except email_service.EmailNotConfiguredError:
        logger.warning(
            "EMAIL_USER/EMAIL_PASS not configured. Password reset token for %s: %s",
            email,
            token,
        )
        raise PasswordResetEmailError(
            "Email is not configured on the server. Add EMAIL_USER and EMAIL_PASS to Backend/.env."
        ) from None
    except email_service.EmailDeliveryError as exc:
        logger.exception("Failed to send password reset email to %s", email)
        raise PasswordResetEmailError(exc.message) from None


def reset_password(db: Session, token: str, password: str) -> User:
    payload = decode_password_reset_token(token)
    if payload is None:
        raise InvalidResetTokenError()

    try:
        user_id = uuid.UUID(payload["sub"])
    except (KeyError, ValueError) as exc:
        raise InvalidResetTokenError() from exc

    user = get_user_by_id(db, user_id)
    if user is None:
        raise InvalidResetTokenError()

    user.hashed_password = hash_password(password)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
