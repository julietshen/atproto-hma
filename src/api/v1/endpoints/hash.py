"""
AT Protocol HMA Integration - Hash Endpoint
"""

import io
import tempfile
from typing import Dict, List, Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from fastapi.responses import JSONResponse
from loguru import logger
import requests
from PIL import Image

from src.core.config import settings
from src.models.hash import HashRequest, HashResponse, HashResult
from src.services.hma_client import HMAClient
from src.utils.image_utils import process_image

router = APIRouter()
hma_client = HMAClient(settings.HMA_API_URL, settings.HMA_API_KEY)

@router.post("/", response_model=HashResponse)
async def hash_image(
    file: UploadFile = File(...),
    metadata: Optional[str] = Form(None)
):
    """
    Hash an image using the HMA service.
    
    Args:
        file: The image file to hash
        metadata: Optional metadata about the image
        
    Returns:
        HashResponse: The hash results
    """
    try:
        # Read the image file
        contents = await file.read()
        
        # Process the image for hashing
        processed_image = process_image(contents)
        
        # Create a temporary file for the processed image
        with tempfile.NamedTemporaryFile(suffix=".jpg") as temp_file:
            # Save the processed image to the temporary file
            Image.open(io.BytesIO(processed_image)).save(temp_file.name)
            
            # Hash the image using the HMA service
            hash_results = hma_client.hash_image(temp_file.name)
            
            # Create the response
            response = HashResponse(
                filename=file.filename,
                content_type=file.content_type,
                size=len(contents),
                hashes=hash_results
            )
            
            logger.info(f"Successfully hashed image: {file.filename}")
            return response
            
    except Exception as e:
        logger.error(f"Error hashing image: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error hashing image: {str(e)}")

@router.post("/url", response_model=HashResponse)
async def hash_image_from_url(request: HashRequest):
    """
    Hash an image from a URL using the HMA service.
    
    Args:
        request: The hash request containing the image URL
        
    Returns:
        HashResponse: The hash results
    """
    try:
        # Download the image from the URL
        response = requests.get(request.url, timeout=settings.REQUEST_TIMEOUT_SECONDS)
        response.raise_for_status()
        contents = response.content
        
        # Process the image for hashing
        processed_image = process_image(contents)
        
        # Create a temporary file for the processed image
        with tempfile.NamedTemporaryFile(suffix=".jpg") as temp_file:
            # Save the processed image to the temporary file
            Image.open(io.BytesIO(processed_image)).save(temp_file.name)
            
            # Hash the image using the HMA service
            hash_results = hma_client.hash_image(temp_file.name)
            
            # Create the response
            response = HashResponse(
                filename=request.url.split("/")[-1],
                content_type="image/jpeg",
                size=len(contents),
                hashes=hash_results
            )
            
            logger.info(f"Successfully hashed image from URL: {request.url}")
            return response
            
    except Exception as e:
        logger.error(f"Error hashing image from URL: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error hashing image from URL: {str(e)}") 