"""
AT Protocol HMA Integration - Action Models
"""

from typing import Dict, List, Optional
from datetime import datetime
from pydantic import BaseModel, Field

class ActionResult(BaseModel):
    """
    Result of an action operation.
    """
    success: bool = Field(..., description="Whether the action was successful")
    action_type: str = Field(..., description="The type of action that was taken")
    content_id: str = Field(..., description="ID of the content that the action was taken on")
    details: Optional[str] = Field(None, description="Details about the action result")
    metadata: Optional[Dict] = Field(None, description="Additional metadata about the action result")

class ActionRequest(BaseModel):
    """
    Request to take an action based on a match.
    """
    action_id: str = Field(..., description="Unique ID for this action request")
    action_type: str = Field(..., description="Type of action to take (e.g., 'log', 'report_ncmec', 'takedown', 'review')")
    content_id: str = Field(..., description="ID of the content to take action on")
    match_info: Dict = Field(..., description="Information about the match that triggered this action")
    metadata: Optional[Dict] = Field(None, description="Additional metadata about the action")
    timestamp: datetime = Field(default_factory=datetime.now, description="Timestamp of the action request")

class ActionResponse(BaseModel):
    """
    Response from an action operation.
    """
    action_id: str = Field(..., description="ID of the action request")
    result: ActionResult = Field(..., description="Result of the action")
    timestamp: datetime = Field(..., description="Timestamp of the action request") 