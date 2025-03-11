"""
AT Protocol HMA Integration - Configuration Module
"""

import os
from typing import Optional

class Settings:
    """
    Application settings loaded from environment variables.
    """
    def __init__(self):
        # Database settings
        self.DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@db:5432/atproto_hma")

        # HMA service settings
        self.HMA_API_URL = os.environ.get("HMA_API_URL", "http://hma:5000")
        self.HMA_API_KEY = os.environ.get("HMA_API_KEY")

        # AT Protocol settings
        self.AT_PROTOCOL_PDS_URL = os.environ.get("AT_PROTOCOL_PDS_URL", "http://pds:3000")
        self.AT_PROTOCOL_API_KEY = os.environ.get("AT_PROTOCOL_API_KEY")

        # NCMEC settings
        self.NCMEC_API_KEY = os.environ.get("NCMEC_API_KEY")
        self.NCMEC_ORGANIZATION_ID = os.environ.get("NCMEC_ORGANIZATION_ID")

        # Logging settings
        self.LOG_LEVEL = self._validate_log_level(os.environ.get("LOG_LEVEL", "INFO"))
        self.LOG_FILE = os.environ.get("LOG_FILE")

        # Service settings
        self.PORT = int(os.environ.get("PORT", 3000))
        self.HOST = os.environ.get("HOST", "0.0.0.0")
        self.WORKERS = int(os.environ.get("WORKERS", 4))
        self.DEBUG = os.environ.get("DEBUG", "").lower() in ("true", "1", "yes")

        # Security settings
        self.JWT_SECRET = os.environ.get("JWT_SECRET")
        self.ENCRYPTION_KEY = os.environ.get("ENCRYPTION_KEY")

        # Feature flags
        self.ENABLE_NCMEC_REPORTING = os.environ.get("ENABLE_NCMEC_REPORTING", "").lower() in ("true", "1", "yes")
        self.ENABLE_AUDIT_LOGGING = os.environ.get("ENABLE_AUDIT_LOGGING", "").lower() in ("true", "1", "yes")
        self.ENABLE_METRICS = os.environ.get("ENABLE_METRICS", "").lower() in ("true", "1", "yes")

        # Performance tuning
        self.MAX_CONCURRENT_REQUESTS = int(os.environ.get("MAX_CONCURRENT_REQUESTS", 100))
        self.REQUEST_TIMEOUT_SECONDS = int(os.environ.get("REQUEST_TIMEOUT_SECONDS", 30))
        self.HASH_CACHE_SIZE = int(os.environ.get("HASH_CACHE_SIZE", 1000))

    def _validate_log_level(self, level: str) -> str:
        """
        Validate that the log level is one of the allowed values.
        """
        allowed_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        level_upper = level.upper()
        if level_upper not in allowed_levels:
            raise ValueError(f"Log level must be one of {allowed_levels}")
        return level_upper

# Create settings instance
settings = Settings() 