from models.user import User
from extensions import db


def register_user(email: str, password: str, name: str | None = None) -> User:
    email = (email or "").strip().lower()
    if not email or not password:
        raise ValueError("Email and password are required.")

    existing = User.query.filter_by(email=email).first()
    if existing:
        raise ValueError("Email is already registered.")

    user = User(
        email=email,
        full_name=(name or "").strip() or None,
        role="user",
    )
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    return user


def authenticate_user(email: str, password: str) -> User:
    email = (email or "").strip().lower()
    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        raise ValueError("Invalid email or password.")
    return user


def get_user_by_id(user_id) -> User | None:
    try:
        return db.session.get(User, int(user_id))
    except (TypeError, ValueError):
        return None


def update_profile(
    user_id,
    *,
    email: str | None = None,
    full_name: str | None = None,
    update_full_name: bool = False,
    current_password: str | None = None,
    new_password: str | None = None,
) -> User:
    user = get_user_by_id(user_id)
    if not user:
        raise LookupError("User not found.")

    if email is not None:
        next_email = email.strip().lower()
        if not next_email:
            raise ValueError("Email is required.")
        clash = User.query.filter(User.email == next_email, User.id != user.id).first()
        if clash:
            raise ValueError("Email is already registered.")
        user.email = next_email

    if update_full_name:
        user.full_name = (full_name or "").strip() or None

    if new_password:
        if not current_password:
            raise ValueError("Current password is required to set a new password.")
        if not user.check_password(current_password):
            raise ValueError("Current password is incorrect.")
        if len(new_password) < 6:
            raise ValueError("New password must be at least 6 characters.")
        if current_password == new_password:
            raise ValueError("New password must be different from the current password.")
        user.set_password(new_password)

    db.session.commit()
    return user


def get_user_by_id(user_id) -> User | None:
    try:
        return db.session.get(User, int(user_id))
    except (TypeError, ValueError):
        return None
