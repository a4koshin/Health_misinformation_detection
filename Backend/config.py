import os
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv

# Load only Backend/.env — never .env.example
_ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(_ENV_PATH, override=True)


class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    # Neon closes idle SSL connections; pre-ping discards dead ones before use,
    # and recycle refreshes pool entries before the server-side timeout.
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
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "mehelpus")
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
    # LLM providers (Cerebras primary, Groq backup by default)
    CEREBRAS_API_KEY = os.getenv("CEREBRAS_API_KEY", "").strip()
    GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()
    # cerebras (default) or groq — which provider to try first
    LLM_PRIMARY = (os.getenv("LLM_PRIMARY", "cerebras") or "cerebras").strip().lower()
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(
        minutes=int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES_MINUTES", "60"))
    )
    # Allow large CSV/Excel dataset uploads (up to 20k rows).
    MAX_CONTENT_LENGTH = int(os.getenv("MAX_CONTENT_LENGTH", str(64 * 1024 * 1024)))
    ADMIN_USER = (os.getenv("ADMIN_USER") or os.getenv("ADMIN_EMAIL") or "").strip()
    ADMIN_PASSWORD = (os.getenv("ADMIN_PASSWORD") or os.getenv("PASSWORD") or "").strip()
    ADMIN_NAME = (os.getenv("ADMIN_NAME") or "Admin").strip() or "Admin"
