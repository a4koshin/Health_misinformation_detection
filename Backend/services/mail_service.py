"""SMTP delivery for password reset. Uses MAIL_* or EMAIL_USER / EMAIL_PASS."""

from __future__ import annotations

import os
import smtplib
from email.message import EmailMessage


def _mail_username() -> str:
    return (os.getenv("MAIL_USERNAME") or os.getenv("EMAIL_USER") or "").strip()


def _mail_password() -> str:
    return (os.getenv("MAIL_PASSWORD") or os.getenv("EMAIL_PASS") or "").strip()


def _mail_from() -> str:
    return (
        os.getenv("MAIL_FROM")
        or os.getenv("MAIL_USERNAME")
        or os.getenv("EMAIL_USER")
        or ""
    ).strip()


def mail_configured() -> bool:
    return bool(
        (os.getenv("MAIL_SERVER") or "").strip()
        and _mail_from()
        and _mail_username()
        and _mail_password()
    )


def send_email(*, to_address: str, subject: str, body: str, html: str | None = None) -> bool:
    if not mail_configured():
        return False

    host = (os.getenv("MAIL_SERVER") or "").strip()
    sender = _mail_from()
    port = int(os.getenv("MAIL_PORT") or "587")
    username = _mail_username()
    password = _mail_password()
    use_tls = (os.getenv("MAIL_USE_TLS") or "true").strip().lower() in {
        "1",
        "true",
        "yes",
    }

    message = EmailMessage()
    message["From"] = sender
    message["To"] = to_address
    message["Subject"] = subject
    message.set_content(body)
    if html:
        message.add_alternative(html, subtype="html")

    if port == 465:
        with smtplib.SMTP_SSL(host, port, timeout=20) as smtp:
            smtp.login(username, password)
            smtp.send_message(message)
    else:
        with smtplib.SMTP(host, port, timeout=20) as smtp:
            if use_tls:
                smtp.starttls()
            smtp.login(username, password)
            smtp.send_message(message)
    return True
