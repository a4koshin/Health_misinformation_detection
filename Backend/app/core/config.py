from pathlib import Path

from dotenv import load_dotenv
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

load_dotenv(Path(__file__).resolve().parents[2] / ".env")


def _clean_env_string(value: str | None) -> str | None:
    if value is None:
        return None
    return value.strip().strip('"').strip("'")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    database_url: str
    port: int = 4000
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    frontend_origin: str = "http://localhost:3000"
    email_user: str | None = None
    email_pass: str | None = None
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    admin_email: str | None = None
    admin_password: str | None = None
    admin_full_name: str = "HealthAI Administrator"

    @field_validator("email_user", "admin_email", "admin_full_name", mode="before")
    @classmethod
    def normalize_optional_string(cls, value: str | None) -> str | None:
        return _clean_env_string(value)

    @field_validator("email_pass", mode="before")
    @classmethod
    def normalize_email_pass(cls, value: str | None) -> str | None:
        cleaned = _clean_env_string(value)
        if cleaned is None:
            return None
        return cleaned.replace(" ", "")

    @field_validator("admin_password", mode="before")
    @classmethod
    def normalize_admin_password(cls, value: str | None) -> str | None:
        return _clean_env_string(value)


settings = Settings()
