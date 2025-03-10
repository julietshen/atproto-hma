"""
AT Protocol HMA Integration - Logging Module
"""

import os
import sys
import logging
from pathlib import Path
from loguru import logger

from src.core.config import settings

def setup_logging():
    """
    Configure logging for the application.
    """
    # Remove default loguru handler
    logger.remove()

    # Configure loguru to output to stderr with the specified log level
    logger.add(
        sys.stderr,
        level=settings.LOG_LEVEL,
        format="<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
    )

    # If a log file is specified, also log to file
    if settings.LOG_FILE:
        log_file_path = Path(settings.LOG_FILE)
        
        # Create directory if it doesn't exist
        log_file_path.parent.mkdir(parents=True, exist_ok=True)
        
        logger.add(
            log_file_path,
            level=settings.LOG_LEVEL,
            format="{time:YYYY-MM-DD HH:mm:ss.SSS} | {level: <8} | {name}:{function}:{line} - {message}",
            rotation="10 MB",
            retention="1 week",
        )

    # Intercept standard library logging
    class InterceptHandler(logging.Handler):
        def emit(self, record):
            # Get corresponding Loguru level if it exists
            try:
                level = logger.level(record.levelname).name
            except ValueError:
                level = record.levelno

            # Find caller from where originated the logged message
            frame, depth = logging.currentframe(), 2
            while frame.f_code.co_filename == logging.__file__:
                frame = frame.f_back
                depth += 1

            logger.opt(depth=depth, exception=record.exc_info).log(
                level, record.getMessage()
            )

    # Configure standard library logging to use our handler
    logging.basicConfig(handlers=[InterceptHandler()], level=0, force=True)

    # Replace standard library logging handlers with our interceptor
    for name in logging.root.manager.loggerDict.keys():
        logging.getLogger(name).handlers = []
        logging.getLogger(name).propagate = True

    # Log startup information
    logger.info(f"Logging initialized with level: {settings.LOG_LEVEL}")
    if settings.LOG_FILE:
        logger.info(f"Logging to file: {settings.LOG_FILE}")

    return logger 