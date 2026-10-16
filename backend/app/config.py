"""Application configuration management using pydantic-settings."""

import os
import secrets
from pathlib import Path
from typing import List
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuration settings for PhonePilot backend."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    phonepilot_host: str = Field(default="0.0.0.0", validation_alias="PHONEPILOT_HOST")
    phonepilot_port: int = Field(default=8265, validation_alias="PHONEPILOT_PORT")
    phonepilot_db_path: str = Field(default="./phonepilot.db", validation_alias="PHONEPILOT_DB_PATH")
    phonepilot_log_level: str = Field(default="INFO", validation_alias="PHONEPILOT_LOG_LEVEL")
    phonepilot_secret_key: str = Field(default="", validation_alias="PHONEPILOT_SECRET_KEY")
    phonepilot_api_key: str = Field(default="", validation_alias="PHONEPILOT_API_KEY")
    phonepilot_allowed_origins: str = Field(
        default="http://localhost:5173,http://localhost:3000",
        validation_alias="PHONEPILOT_ALLOWED_ORIGINS",
    )
    phonepilot_sandbox_dir: str = Field(default="./sandbox", validation_alias="PHONEPILOT_SANDBOX_DIR")
    phonepilot_max_task_timeout: int = Field(default=300, validation_alias="PHONEPILOT_MAX_TASK_TIMEOUT")
    phonepilot_rate_limit: int = Field(default=100, validation_alias="PHONEPILOT_RATE_LIMIT")

    # JWT Settings
    jwt_algorithm: str = "HS256"
    jwt_expiration_minutes: int = 1440  # 24 hours

    def model_post_init(self, __context: object) -> None:
        # Auto-generate secret key if not provided
        if not self.phonepilot_secret_key:
            self.phonepilot_secret_key = secrets.token_urlsafe(32)

        # Auto-generate API key if not provided
        if not self.phonepilot_api_key:
            self.phonepilot_api_key = f"pp_live_{secrets.token_hex(24)}"

        # Ensure sandbox directory exists
        sandbox = Path(self.phonepilot_sandbox_dir).resolve()
        sandbox.mkdir(parents=True, exist_ok=True)
        self.phonepilot_sandbox_dir = str(sandbox)

        # Ensure parent directory for db_path exists
        db_path = Path(self.phonepilot_db_path).resolve()
        db_path.parent.mkdir(parents=True, exist_ok=True)
        self.phonepilot_db_path = str(db_path)

    @property
    def allowed_origins_list(self) -> List[str]:
        """Return allowed CORS origins as a list of trimmed strings."""
        if not self.phonepilot_allowed_origins:
            return ["*"]
        if isinstance(self.phonepilot_allowed_origins, list):
            return self.phonepilot_allowed_origins
        return [
            origin.strip()
            for origin in self.phonepilot_allowed_origins.split(",")
            if origin.strip()
        ]


# Singleton settings instance
settings = Settings()


def get_settings() -> Settings:
    """Dependency provider for application settings."""
    return settings
