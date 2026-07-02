import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailNotConfiguredError(Exception):
    pass


class EmailDeliveryError(Exception):
    pass


def _is_email_configured() -> bool:
    return bool(settings.email_user and settings.email_pass)


def send_password_reset_email(to_email: str, reset_url: str) -> None:
    if not _is_email_configured():
        raise EmailNotConfiguredError()

    subject = "Reset your HealthAI password"
    text_body = (
        "You requested a password reset for your HealthAI account.\n\n"
        f"Reset your password using this link (valid for 30 minutes):\n{reset_url}\n\n"
        "If you did not request this, you can ignore this email."
    )
    html_body = f"""
    <p>You requested a password reset for your HealthAI account.</p>
    <p><a href="{reset_url}">Reset your password</a></p>
    <p>This link is valid for 30 minutes.</p>
    <p>If you did not request this, you can ignore this email.</p>
    """

    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = settings.email_user
    message["To"] = to_email
    message.attach(MIMEText(text_body, "plain"))
    message.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=30) as server:
            server.starttls()
            server.login(settings.email_user, settings.email_pass)
            server.sendmail(settings.email_user, [to_email], message.as_string())
    except smtplib.SMTPException as exc:
        logger.exception("SMTP error while sending password reset email to %s", to_email)
        raise EmailDeliveryError() from exc
