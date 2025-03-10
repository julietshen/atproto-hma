"""
AT Protocol HMA Integration - AT Protocol Client
"""

import json
import requests
from typing import Dict, List, Optional, Any
from loguru import logger

class ATProtoClient:
    """
    Client for interacting with the AT Protocol.
    """
    
    def __init__(self, base_url: str, api_key: Optional[str] = None):
        """
        Initialize the AT Protocol client.
        
        Args:
            base_url: Base URL of the AT Protocol service
            api_key: API key for the AT Protocol service (if required)
        """
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.session = requests.Session()
        
        # Set up headers
        self.headers = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        
        if api_key:
            self.headers["Authorization"] = f"Bearer {api_key}"
    
    async def takedown_content(self, content_id: str, reason: str, match_info: Dict) -> Dict:
        """
        Take down content from the AT Protocol.
        
        Args:
            content_id: ID of the content to take down
            reason: Reason for the takedown
            match_info: Information about the match that triggered the takedown
            
        Returns:
            Dict: The takedown result
        """
        try:
            # Prepare the request payload
            payload = {
                "content_id": content_id,
                "reason": reason,
                "match_info": match_info
            }
            
            # Make the request to the AT Protocol service
            response = self.session.post(
                f"{self.base_url}/moderation/takedown",
                json=payload,
                headers=self.headers
            )
            
            # Check for errors
            response.raise_for_status()
            
            # Parse the response
            data = response.json()
            
            return data
                
        except Exception as e:
            logger.error(f"Error taking down content: {str(e)}")
            return {"success": False, "details": str(e)}
    
    async def queue_for_review(self, content_id: str, match_info: Dict, metadata: Optional[Dict] = None) -> Dict:
        """
        Queue content for human review in the AT Protocol.
        
        Args:
            content_id: ID of the content to queue
            match_info: Information about the match
            metadata: Additional metadata about the content
            
        Returns:
            Dict: The queue result
        """
        try:
            # Prepare the request payload
            payload = {
                "content_id": content_id,
                "match_info": match_info,
                "metadata": metadata or {}
            }
            
            # Make the request to the AT Protocol service
            response = self.session.post(
                f"{self.base_url}/moderation/queue",
                json=payload,
                headers=self.headers
            )
            
            # Check for errors
            response.raise_for_status()
            
            # Parse the response
            data = response.json()
            
            return data
                
        except Exception as e:
            logger.error(f"Error queueing content for review: {str(e)}")
            return {"success": False, "details": str(e)}
    
    async def get_status(self) -> Dict[str, Any]:
        """
        Get the status of the AT Protocol service.
        
        Returns:
            Dict: The status information
        """
        try:
            # Make the request to the AT Protocol service
            response = self.session.get(
                f"{self.base_url}/status",
                headers=self.headers
            )
            
            # Check for errors
            response.raise_for_status()
            
            # Parse the response
            data = response.json()
            
            return data
                
        except Exception as e:
            logger.error(f"Error getting AT Protocol status: {str(e)}")
            return {"error": str(e)}
    
    async def register_webhook(self, callback_url: str, events: List[str]) -> Dict:
        """
        Register a webhook with the AT Protocol service.
        
        Args:
            callback_url: URL to call when events occur
            events: List of event types to subscribe to
            
        Returns:
            Dict: The registration result
        """
        try:
            # Prepare the request payload
            payload = {
                "callback_url": callback_url,
                "events": events
            }
            
            # Make the request to the AT Protocol service
            response = self.session.post(
                f"{self.base_url}/webhooks/register",
                json=payload,
                headers=self.headers
            )
            
            # Check for errors
            response.raise_for_status()
            
            # Parse the response
            data = response.json()
            
            return data
                
        except Exception as e:
            logger.error(f"Error registering webhook: {str(e)}")
            return {"success": False, "details": str(e)} 