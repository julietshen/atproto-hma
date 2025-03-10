"""
AT Protocol HMA Integration - Configuration Module
"""

import os
from typing import Optional
from pydantic import BaseSettings, PostgresDsn, validator

class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    """
    # Database settings
    DATABASE_URL: PostgresDsn

    # HMA service settings
    HMA_API_URL: str
    HMA_API_KEY: Optional[str] = None

    # AT Protocol settings
    AT_PROTOCOL_PDS_URL: str
    AT_PROTOCOL_API_KEY: Optional[str] = None

    # NCMEC settings
    NCMEC_API_KEY: Optional[str] = None
    NCMEC_ORGANIZATION_ID: Optional[str] = None

    # Logging settings
    LOG_LEVEL: str = "INFO"
    LOG_FILE: Optional[str] = None

    # Service settings
    PORT: int = 3000
    HOST: str = "0.0.0.0"
    WORKERS: int = 4
    DEBUG: bool = False

    # Security settings
    JWT_SECRET: Optional[str] = None
    ENCRYPTION_KEY: Optional[str] = None

    # Feature flags
    ENABLE_NCMEC_REPORTING: bool = True
    ENABLE_AUDIT_LOGGING: bool = True
    ENABLE_METRICS: bool = True

    # Performance tuning
    MAX_CONCURRENT_REQUESTS: int = 100
    REQUEST_TIMEOUT_SECONDS: int = 30
    HASH_CACHE_SIZE: int = 1000

    class Config:
        """
        Pydantic configuration class.
        """
        env_file = ".env"
        case_sensitive = True

    @validator("LOG_LEVEL")
    def validate_log_level(cls, v):
        """
        Validate that the log level is one of the allowed values.
        """
        allowed_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        if v.upper() not in allowed_levels:
            raise ValueError(f"Log level must be one of {allowed_levels}")
        return v.upper()

# Create settings instance
settings = Settings() 