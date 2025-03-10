"""
AT Protocol HMA Integration - Status Endpoint
"""

from typing import Dict, Any
from fastapi import APIRouter, HTTPException
from loguru import logger
import requests
import time

from src.core.config import settings
from src.services.hma_client import HMAClient
from src.services.atproto_client import ATProtoClient

router = APIRouter()
hma_client = HMAClient(settings.HMA_API_URL, settings.HMA_API_KEY)
atproto_client = ATProtoClient(settings.AT_PROTOCOL_PDS_URL, settings.AT_PROTOCOL_API_KEY)

@router.get("/")
async def get_status():
    """
    Get the status of the AT Protocol HMA integration.
    
    Returns:
        Dict: The status information
    """
    try:
        start_time = time.time()
        
        # Check HMA service status
        try:
            hma_status = hma_client.get_status()
            hma_healthy = True
        except Exception as e:
            logger.error(f"Error checking HMA status: {str(e)}")
            hma_status = {"error": str(e)}
            hma_healthy = False
        
        # Check AT Protocol service status
        try:
            atproto_status = await atproto_client.get_status()
            atproto_healthy = True
        except Exception as e:
            logger.error(f"Error checking AT Protocol status: {str(e)}")
            atproto_status = {"error": str(e)}
            atproto_healthy = False
        
        # Calculate response time
        response_time = time.time() - start_time
        
        # Create the status response
        status = {
            "service": "AT Protocol HMA Integration",
            "version": "0.1.0",
            "healthy": hma_healthy and atproto_healthy,
            "response_time_ms": round(response_time * 1000, 2),
            "components": {
                "hma": {
                    "healthy": hma_healthy,
                    "status": hma_status
                },
                "atproto": {
                    "healthy": atproto_healthy,
                    "status": atproto_status
                }
            },
            "config": {
                "ncmec_reporting_enabled": settings.ENABLE_NCMEC_REPORTING,
                "audit_logging_enabled": settings.ENABLE_AUDIT_LOGGING,
                "metrics_enabled": settings.ENABLE_METRICS
            }
        }
        
        logger.info(f"Status check completed in {response_time:.2f}s")
        return status
            
    except Exception as e:
        logger.error(f"Error getting status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting status: {str(e)}")

@router.get("/metrics")
async def get_metrics():
    """
    Get metrics for the AT Protocol HMA integration.
    
    Returns:
        Dict: The metrics information
    """
    try:
        # Check if metrics are enabled
        if not settings.ENABLE_METRICS:
            raise HTTPException(status_code=400, detail="Metrics are not enabled")
        
        # Get metrics from HMA service
        try:
            hma_metrics = hma_client.get_metrics()
        except Exception as e:
            logger.error(f"Error getting HMA metrics: {str(e)}")
            hma_metrics = {"error": str(e)}
        
        # Create the metrics response
        metrics = {
            "service": "AT Protocol HMA Integration",
            "timestamp": time.time(),
            "hma_metrics": hma_metrics,
            "integration_metrics": {
                # Add integration-specific metrics here
                "requests_processed": 0,  # Placeholder
                "matches_found": 0,       # Placeholder
                "actions_taken": 0        # Placeholder
            }
        }
        
        logger.info("Metrics retrieved successfully")
        return metrics
            
    except Exception as e:
        logger.error(f"Error getting metrics: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting metrics: {str(e)}") 