"""
AT Protocol HMA Integration - Main Entry Point
"""

import os
import sys
import logging
from dotenv import load_dotenv
import uvicorn
from fastapi import FastAPI
from loguru import logger

from src.api.router import api_router
from src.core.config import settings
from src.core.logging import setup_logging

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(
    title="AT Protocol HMA Integration",
    description="Hasher-Matcher-Actioner (HMA) integration for AT Protocol applications",
    version="0.1.0",
)

# Setup logging
setup_logging()

# Include API router
app.include_router(api_router)

@app.on_event("startup")
async def startup_event():
    """
    Startup event handler for the FastAPI application.
    """
    logger.info("Starting AT Protocol HMA Integration service")
    # Additional startup logic can be added here

@app.on_event("shutdown")
async def shutdown_event():
    """
    Shutdown event handler for the FastAPI application.
    """
    logger.info("Shutting down AT Protocol HMA Integration service")
    # Additional shutdown logic can be added here

@app.get("/health")
async def health_check():
    """
    Health check endpoint.
    """
    return {"status": "healthy"}

def main():
    """
    Main function to run the application.
    """
    try:
        uvicorn.run(
            "src.main:app",
            host=settings.HOST,
            port=settings.PORT,
            workers=settings.WORKERS,
            reload=settings.DEBUG,
            log_level=settings.LOG_LEVEL.lower(),
        )
    except Exception as e:
        logger.error(f"Error starting server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 