"""
AT Protocol HMA Integration - Action Endpoint
"""

from typing import Dict, List, Optional
from fastapi import APIRouter, HTTPException
from loguru import logger

from src.core.config import settings
from src.models.action import ActionRequest, ActionResponse, ActionResult
from src.services.hma_client import HMAClient
from src.services.atproto_client import ATProtoClient

router = APIRouter()
hma_client = HMAClient(settings.HMA_API_URL, settings.HMA_API_KEY)
atproto_client = ATProtoClient(settings.AT_PROTOCOL_PDS_URL, settings.AT_PROTOCOL_API_KEY)

@router.post("/", response_model=ActionResponse)
async def take_action(request: ActionRequest):
    """
    Take action based on a match result.
    
    Args:
        request: The action request containing the match information and action to take
        
    Returns:
        ActionResponse: The result of the action
    """
    try:
        # Log the action request
        logger.info(f"Action requested: {request.action_type} for content ID: {request.content_id}")
        
        # Take the appropriate action based on the action type
        if request.action_type == "log":
            # Just log the match, no further action needed
            result = ActionResult(
                success=True,
                action_type=request.action_type,
                content_id=request.content_id,
                details="Match logged successfully"
            )
        
        elif request.action_type == "report_ncmec":
            # Report to NCMEC if enabled
            if not settings.ENABLE_NCMEC_REPORTING:
                raise HTTPException(status_code=400, detail="NCMEC reporting is not enabled")
            
            # Use HMA client to report to NCMEC
            report_result = hma_client.report_to_ncmec(
                content_id=request.content_id,
                match_info=request.match_info,
                metadata=request.metadata
            )
            
            result = ActionResult(
                success=True,
                action_type=request.action_type,
                content_id=request.content_id,
                details=f"Reported to NCMEC: {report_result}"
            )
        
        elif request.action_type == "takedown":
            # Take down the content from AT Protocol
            takedown_result = await atproto_client.takedown_content(
                content_id=request.content_id,
                reason=request.metadata.get("reason", "Content policy violation"),
                match_info=request.match_info
            )
            
            result = ActionResult(
                success=takedown_result.get("success", False),
                action_type=request.action_type,
                content_id=request.content_id,
                details=takedown_result.get("details", "Content takedown attempted")
            )
        
        elif request.action_type == "review":
            # Queue for human review
            review_result = await atproto_client.queue_for_review(
                content_id=request.content_id,
                match_info=request.match_info,
                metadata=request.metadata
            )
            
            result = ActionResult(
                success=review_result.get("success", False),
                action_type=request.action_type,
                content_id=request.content_id,
                details=review_result.get("details", "Content queued for review")
            )
        
        else:
            # Unknown action type
            raise HTTPException(status_code=400, detail=f"Unknown action type: {request.action_type}")
        
        # Create the response
        response = ActionResponse(
            action_id=request.action_id,
            timestamp=request.timestamp,
            result=result
        )
        
        return response
            
    except Exception as e:
        logger.error(f"Error taking action: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error taking action: {str(e)}")

@router.post("/batch", response_model=List[ActionResponse])
async def batch_take_actions(requests: List[ActionRequest]):
    """
    Take multiple actions in a batch.
    
    Args:
        requests: List of action requests
        
    Returns:
        List[ActionResponse]: The results of the actions
    """
    try:
        responses = []
        
        for request in requests:
            try:
                # Process each action request individually
                response = await take_action(request)
                responses.append(response)
            except HTTPException as e:
                # If an individual action fails, include the error in the response
                # but continue processing other actions
                logger.warning(f"Action failed for content ID {request.content_id}: {str(e)}")
                responses.append(ActionResponse(
                    action_id=request.action_id,
                    timestamp=request.timestamp,
                    result=ActionResult(
                        success=False,
                        action_type=request.action_type,
                        content_id=request.content_id,
                        details=f"Error: {str(e.detail)}"
                    )
                ))
        
        logger.info(f"Successfully processed {len(requests)} actions in batch")
        return responses
            
    except Exception as e:
        logger.error(f"Error processing batch actions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing batch actions: {str(e)}") 