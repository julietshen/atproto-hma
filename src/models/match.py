"""
AT Protocol HMA Integration - Match Models
"""

from typing import Dict, List, Optional
from datetime import datetime
from pydantic import BaseModel, Field

class MatchResult(BaseModel):
    """
    Result of a match operation.
    """
    bank_id: str = Field(..., description="ID of the bank that matched")
    bank_name: str = Field(..., description="Name of the bank that matched")
    distance: float = Field(..., description="Distance/similarity score of the match")
    hash_value: str = Field(..., description="The hash value that matched")
    metadata: Optional[Dict] = Field(None, description="Additional metadata about the match")

class MatchRequest(BaseModel):
    """
    Request to match a hash against the database.
    """
    hash_value: str = Field(..., description="The hash value to match")
    hash_type: str = Field(..., description="The type of hash (e.g., 'pdq', 'md5')")
    threshold: float = Field(0.9, description="Threshold for considering a match (0.0 to 1.0)")
    banks: Optional[List[str]] = Field(None, description="Specific banks to match against (if None, match against all)")
    metadata: Optional[Dict] = Field(None, description="Additional metadata about the hash")

class MatchResponse(BaseModel):
    """
    Response from a match operation.
    """
    hash_value: str = Field(..., description="The hash value that was matched")
    hash_type: str = Field(..., description="The type of hash that was matched")
    threshold: float = Field(..., description="The threshold that was used")
    matches: List[MatchResult] = Field(default_factory=list, description="Match results")
    match_count: int = Field(0, description="Number of matches found")
    timestamp: datetime = Field(default_factory=datetime.now, description="Timestamp of the match operation") 