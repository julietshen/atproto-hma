"""
AT Protocol HMA Integration - Hash Models
"""

from typing import Dict, List, Optional
from datetime import datetime
from pydantic import BaseModel, Field, HttpUrl

class HashResult(BaseModel):
    """
    Result of a hash operation.
    """
    algorithm: str = Field(..., description="The hashing algorithm used")
    hash_value: str = Field(..., description="The hash value")
    quality: Optional[float] = Field(None, description="Quality score of the hash (if applicable)")
    metadata: Optional[Dict] = Field(None, description="Additional metadata about the hash")

class HashRequest(BaseModel):
    """
    Request to hash an image from a URL.
    """
    url: HttpUrl = Field(..., description="URL of the image to hash")
    metadata: Optional[Dict] = Field(None, description="Additional metadata about the image")

class HashResponse(BaseModel):
    """
    Response from a hash operation.
    """
    filename: str = Field(..., description="Name of the file that was hashed")
    content_type: str = Field(..., description="Content type of the file")
    size: int = Field(..., description="Size of the file in bytes")
    hashes: List[HashResult] = Field(..., description="Hash results")
    timestamp: datetime = Field(default_factory=datetime.now, description="Timestamp of the hash operation") 