"""
AT Protocol HMA Integration - Webhook Endpoint
"""

from typing import Dict, Any
from fastapi import APIRouter, HTTPException, Request, Depends, Header
from fastapi.responses import JSONResponse
from loguru import logger
import hmac
import hashlib

from src.core.config import settings
from src.services.atproto_client import ATProtoClient

router = APIRouter()
atproto_client = ATProtoClient(settings.AT_PROTOCOL_PDS_URL, settings.AT_PROTOCOL_API_KEY)

async def verify_webhook_signature(
    request: Request,
    x_hma_signature: str = Header(None)
):
    """
    Verify the HMA webhook signature.
    
    Args:
        request: The incoming request
        x_hma_signature: The signature header from HMA
        
    Returns:
        bool: True if the signature is valid
    """
    if not settings.HMA_API_KEY:
        # If no API key is set, skip signature verification
        return True
        
    if not x_hma_signature:
        raise HTTPException(status_code=401, detail="Missing signature header")
    
    # Get the raw request body
    body = await request.body()
    
    # Compute the expected signature
    expected_signature = hmac.new(
        settings.HMA_API_KEY.encode(),
        body,
        hashlib.sha256
    ).hexdigest()
    
    # Compare signatures
    if not hmac.compare_digest(expected_signature, x_hma_signature):
        raise HTTPException(status_code=401, detail="Invalid signature")
    
    return True

@router.post("/hma-callback", dependencies=[Depends(verify_webhook_signature)])
async def hma_callback(payload: Dict[str, Any]):
    """
    Receive callbacks from the HMA service.
    
    Args:
        payload: The callback payload from HMA
        
    Returns:
        JSONResponse: Acknowledgment of the callback
    """
    try:
        # Log the callback
        logger.info(f"Received HMA callback: {payload}")
        
        # Extract event type
        event_type = payload.get("event_type")
        
        if not event_type:
            raise HTTPException(status_code=400, detail="Missing event_type in payload")
        
        # Process based on event type
        if event_type == "match_found":
            # A match was found in the HMA database
            match_info = payload.get("match_info", {})
            content_id = payload.get("content_id")
            
            if not content_id:
                raise HTTPException(status_code=400, detail="Missing content_id in payload")
            
            # Determine action based on match severity or policy
            severity = match_info.get("severity", "unknown")
            
            if severity == "high":
                # High severity matches are taken down automatically
                await atproto_client.takedown_content(
                    content_id=content_id,
                    reason="Matched high-severity content in HMA database",
                    match_info=match_info
                )
                logger.info(f"Automatically took down high-severity content: {content_id}")
            else:
                # Other matches are queued for review
                await atproto_client.queue_for_review(
                    content_id=content_id,
                    match_info=match_info,
                    metadata={"event_type": event_type}
                )
                logger.info(f"Queued content for review: {content_id}")
        
        elif event_type == "index_updated":
            # The HMA index was updated
            logger.info("HMA index was updated")
            
        elif event_type == "error":
            # An error occurred in HMA
            error_info = payload.get("error_info", {})
            logger.error(f"HMA error: {error_info}")
            
        else:
            # Unknown event type
            logger.warning(f"Unknown HMA event type: {event_type}")
        
        # Acknowledge the callback
        return JSONResponse(content={"status": "success", "message": f"Processed {event_type} event"})
            
    except Exception as e:
        logger.error(f"Error processing HMA callback: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing HMA callback: {str(e)}")

@router.post("/atproto-callback")
async def atproto_callback(payload: Dict[str, Any]):
    """
    Receive callbacks from the AT Protocol.
    
    Args:
        payload: The callback payload from AT Protocol
        
    Returns:
        JSONResponse: Acknowledgment of the callback
    """
    try:
        # Log the callback
        logger.info(f"Received AT Protocol callback: {payload}")
        
        # Extract event type
        event_type = payload.get("event_type")
        
        if not event_type:
            raise HTTPException(status_code=400, detail="Missing event_type in payload")
        
        # Process based on event type
        if event_type == "image_upload":
            # A new image was uploaded to AT Protocol
            image_url = payload.get("image_url")
            content_id = payload.get("content_id")
            
            if not image_url or not content_id:
                raise HTTPException(status_code=400, detail="Missing image_url or content_id in payload")
            
            # Process the image through HMA
            # This would typically be done asynchronously in a real implementation
            logger.info(f"Processing new image upload: {content_id}")
            
        elif event_type == "moderation_action":
            # A moderation action was taken in AT Protocol
            logger.info(f"Moderation action in AT Protocol: {payload}")
            
        else:
            # Unknown event type
            logger.warning(f"Unknown AT Protocol event type: {event_type}")
        
        # Acknowledge the callback
        return JSONResponse(content={"status": "success", "message": f"Processed {event_type} event"})
            
    except Exception as e:
        logger.error(f"Error processing AT Protocol callback: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing AT Protocol callback: {str(e)}") 