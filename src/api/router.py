"""
AT Protocol HMA Integration - API Router
"""

from fastapi import APIRouter

from src.api.v1.endpoints import hash, match, action, webhook, status

# Create API router
api_router = APIRouter()

# Include endpoint routers
api_router.include_router(hash.router, prefix="/api/v1/hash", tags=["hash"])
api_router.include_router(match.router, prefix="/api/v1/match", tags=["match"])
api_router.include_router(action.router, prefix="/api/v1/action", tags=["action"])
api_router.include_router(webhook.router, prefix="/api/v1/webhook", tags=["webhook"])
api_router.include_router(status.router, prefix="/api/v1/status", tags=["status"]) 