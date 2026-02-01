"""
Application configuration.

Provides centralized configuration management with environment variable support
and sensible defaults for development and production deployments.
"""
import secrets
from typing import List
from pydantic_settings import BaseSettings
from pydantic import field_validator


class Settings(BaseSettings):
    """Application settings with environment variable support."""

    # API Settings
    PROJECT_NAME: str = "NavIO"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = False
    VERSION: str = "1.0.0"

    # Database
    DATABASE_URL: str = "postgresql://navio_user:navio_password@localhost:5432/navio_db"

    # Database Connection Pool Settings
    DB_POOL_SIZE: int = 5  # Number of persistent connections
    DB_MAX_OVERFLOW: int = 10  # Additional connections when pool is full
    DB_POOL_TIMEOUT: int = 30  # Seconds to wait for connection
    DB_POOL_RECYCLE: int = 1800  # Recycle connections after 30 minutes

    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        """Warn if using default secret key in non-debug mode."""
        if v == "your-secret-key-change-in-production":
            import logging
            logging.warning(
                "Using default SECRET_KEY. Set a secure key via environment variable "
                "for production deployments."
            )
        return v

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:8000"

    @property
    def cors_origins(self) -> List[str]:
        """Parse CORS origins from comma-separated string."""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

    # Upload Configuration
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE: int = 10485760  # 10MB
    ALLOWED_IMAGE_TYPES: List[str] = ["image/png", "image/jpeg", "image/gif", "image/webp"]

    # QR Code
    QR_CODE_BASE_URL: str = "https://yourdomain.com"

    # Booth Detection Settings
    MIN_BOOTH_AREA: int = 300
    MAX_BOOTH_AREA: int = 100000
    DETECTION_THRESHOLD: int = 180

    # Redis Cache
    REDIS_URL: str = "redis://localhost:6379/0"
    CACHE_TTL: int = 3600  # Cache TTL in seconds (1 hour)
    CACHE_ENABLED: bool = True

    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
