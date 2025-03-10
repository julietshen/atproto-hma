"""
AT Protocol HMA Integration - Match Endpoint
"""

from typing import Dict, List, Optional
from fastapi import APIRouter, HTTPException
from loguru import logger

from src.core.config import settings
from src.models.match import MatchRequest, MatchResponse, MatchResult
from src.services.hma_client import HMAClient

router = APIRouter()
hma_client = HMAClient(settings.HMA_API_URL, settings.HMA_API_KEY)

@router.post("/", response_model=MatchResponse)
async def match_hash(request: MatchRequest):
    """
    Match a hash against the HMA database.
    
    Args:
        request: The match request containing the hash to match
        
    Returns:
        MatchResponse: The match results
    """
    try:
        # Match the hash using the HMA service
        match_results = hma_client.match_hash(
            hash_value=request.hash_value,
            hash_type=request.hash_type,
            threshold=request.threshold
        )
        
        # Create the response
        response = MatchResponse(
            hash_value=request.hash_value,
            hash_type=request.hash_type,
            threshold=request.threshold,
            matches=match_results,
            match_count=len(match_results)
        )
        
        logger.info(f"Successfully matched hash: {request.hash_value}")
        return response
            
    except Exception as e:
        logger.error(f"Error matching hash: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error matching hash: {str(e)}")

@router.post("/batch", response_model=List[MatchResponse])
async def batch_match_hashes(requests: List[MatchRequest]):
    """
    Match multiple hashes against the HMA database in a batch.
    
    Args:
        requests: List of match requests containing hashes to match
        
    Returns:
        List[MatchResponse]: The match results for each hash
    """
    try:
        responses = []
        
        for request in requests:
            # Match the hash using the HMA service
            match_results = hma_client.match_hash(
                hash_value=request.hash_value,
                hash_type=request.hash_type,
                threshold=request.threshold
            )
            
            # Create the response
            response = MatchResponse(
                hash_value=request.hash_value,
                hash_type=request.hash_type,
                threshold=request.threshold,
                matches=match_results,
                match_count=len(match_results)
            )
            
            responses.append(response)
        
        logger.info(f"Successfully matched {len(requests)} hashes in batch")
        return responses
            
    except Exception as e:
        logger.error(f"Error batch matching hashes: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error batch matching hashes: {str(e)}") 