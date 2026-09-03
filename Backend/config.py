import os
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv


_ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(_ENV_PATH, override=True)


class Config:

    SQLALCHEMY_DATABASE_URI = (
        os.getenv("DATABASE_URL", "").strip().strip('"').strip("'")
    )

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 280,
        "pool_size": 5,
        "max_overflow": 10,
        "connect_args": {
            "keepalives": 1,
            "keepalives_idle": 30,
            "keepalives_interval": 10,
            "keepalives_count": 5,
        },
    }
    SECRET_KEY = os.getenv(
        "SECRET_KEY",
        "dev-secret-key-change-this",
    )

    JWT_SECRET_KEY = os.getenv(
        "JWT_SECRET_KEY",
        "mehelpus",
    )

    JWT_ACCESS_TOKEN_EXPIRES = timedelta(
        minutes=int(
            os.getenv(
                "JWT_ACCESS_TOKEN_EXPIRES_MINUTES",
                "60",
            )
        )
    )


    FRONTEND_URL = os.getenv(
        "FRONTEND_URL",
        "http://localhost:3000",
    )

    CEREBRAS_API_KEY = (
        os.getenv("CEREBRAS_API_KEY", "").strip()
    )

    GROQ_API_KEY = (
        os.getenv("GROQ_API_KEY", "").strip()
    )

    LLM_PRIMARY = (
        os.getenv("LLM_PRIMARY", "cerebras")
        or "cerebras"
    ).strip().lower()

    MAX_CONTENT_LENGTH = int(
        os.getenv(
            "MAX_CONTENT_LENGTH",
            str(64 * 1024 * 1024),
        )
    )

    ADMIN_USER = (
        os.getenv("ADMIN_USER")
        or os.getenv("ADMIN_EMAIL")
        or ""
    ).strip()

    ADMIN_PASSWORD = (
        os.getenv("ADMIN_PASSWORD")
        or os.getenv("PASSWORD")
        or ""
    ).strip()

    ADMIN_NAME = (
        os.getenv("ADMIN_NAME")
        or "Admin"
    ).strip() or "Admin"

    MAIL_SERVER = (
        os.getenv("MAIL_SERVER")
        or "smtp.gmail.com"
    ).strip()

    MAIL_PORT = int(
        os.getenv("MAIL_PORT") or "587"
    )

    MAIL_USE_TLS = (
        os.getenv("MAIL_USE_TLS", "true")
        .strip()
        .lower()
        in {"1", "true", "yes", "on"}
    )

    MAIL_USERNAME = (
        os.getenv("MAIL_USERNAME")
        or os.getenv("EMAIL_USER")
        or ""
    ).strip()

    MAIL_PASSWORD = (
        os.getenv("MAIL_PASSWORD")
        or os.getenv("EMAIL_PASS")
        or ""
    )

    MAIL_FROM = (
        os.getenv("MAIL_FROM")
        or MAIL_USERNAME
        or ""
    ).strip()

    EVC_MERCHANT_UID = (
        os.getenv("EVC_MERCHANT_UID") or ""
    ).strip()

    EVC_API_USER_ID = (
        os.getenv("EVC_API_USER_ID") or ""
    ).strip()

    EVC_API_KEY = (
        os.getenv("EVC_API_KEY") or ""
    ).strip()

    EVC_API_URL = (
        os.getenv("EVC_API_URL")
        or "https://api.waafipay.net/asm"
    ).strip()

    EVC_TIMEOUT_SECONDS = int(
        os.getenv("EVC_TIMEOUT_SECONDS") or "120"
    )

    APPOINTMENT_FEE_USD = float(
        os.getenv("APPOINTMENT_FEE_USD") or "0.01"
    )

    _evc_flag = (
        os.getenv("EVC_PLUS_ENABLED") or ""
    ).strip().lower()

    if _evc_flag in {"1", "true", "yes", "on"}:
        EVC_PLUS_ENABLED = True

    elif _evc_flag in {"0", "false", "no", "off"}:
        EVC_PLUS_ENABLED = False

    else:
        EVC_PLUS_ENABLED = bool(
            EVC_MERCHANT_UID
            and EVC_API_USER_ID
            and EVC_API_KEY
        )
