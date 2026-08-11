"""Shared account field validation for register, admin create, and profile."""

from __future__ import annotations

import re

NAME_ALLOWED_RE = re.compile(r"^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ .'-]*[A-Za-zÀ-ÿ]$|^[A-Za-zÀ-ÿ]$")
EMAIL_RE = re.compile(
    r"^(?P<local>[A-Za-z0-9](?:[A-Za-z0-9._%+-]*[A-Za-z0-9])?)"
    r"@(?P<domain>[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?"
    r"(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+)$"
)


def _letter_count(value: str) -> int:
    return sum(1 for char in value if char.isalpha())


def validate_full_name(name: str | None, *, required: bool = True) -> str:
    cleaned = " ".join((name or "").split())
    if not cleaned:
        if required:
            raise ValueError("Full name is required.")
        return ""
    if len(cleaned) < 2:
        raise ValueError("Enter a real full name, not a short code.")
    if cleaned.replace(" ", "").replace("-", "").replace("'", "").replace(".", "").isdigit():
        raise ValueError("Full name cannot be only numbers.")
    if _letter_count(cleaned) < 2:
        raise ValueError("Full name must contain letters, not only numbers.")
    if not NAME_ALLOWED_RE.fullmatch(cleaned):
        raise ValueError(
            "Full name can only include letters, spaces, hyphens, and apostrophes."
        )
    return cleaned


def validate_email(email: str | None) -> str:
    value = (email or "").strip().lower()
    if not value:
        raise ValueError("Email is required.")

    match = EMAIL_RE.fullmatch(value)
    if not match or ".." in value:
        raise ValueError("Enter a valid email address.")

    local = match.group("local")
    domain = match.group("domain")
    tld = domain.rsplit(".", 1)[-1]
    local_core = re.sub(r"[._%+-]", "", local)

    if local_core.isdigit() or _letter_count(local) < 2:
        raise ValueError(
            "Email must use a real name before @, not only numbers like 123@gmail.com."
        )
    if not tld.isalpha() or len(tld) < 2:
        raise ValueError("Enter a valid email address.")
    return value
