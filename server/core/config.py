"""
core/config.py — Centralised Application Configuration
=======================================================
Single source of truth for all env-loaded settings.
All other modules import `settings` from here.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # MongoDB (Atlas or local)
    mongo_uri: str = Field(default="mongodb://localhost:27017")
    mongo_db_name: str = Field(default="meeting_summarizer")

    # Groq Cloud AI
    groq_base_url: str = Field(default="https://api.groq.com/openai/v1")
    groq_api_key: str = Field(default="")
    groq_model: str = Field(default="llama3-8b-8192")

    # JWT Auth
    jwt_secret: str = Field(default="change-me-in-production")
    jwt_algorithm: str = Field(default="HS256")
    jwt_expire_minutes: int = Field(default=60 * 24 * 7)  # 7 days

    # Server
    port: int = Field(default=8000)
    host: str = Field(default="0.0.0.0")

    # TODO (2026-06-24): Add Lemma SDK key here
    # lemma_api_key: str = Field(default="")


settings = Settings()
