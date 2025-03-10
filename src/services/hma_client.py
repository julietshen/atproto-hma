"""
AT Protocol HMA Integration - HMA Client
"""

import os
import json
import requests
from typing import Dict, List, Optional, Any
from loguru import logger

from src.core.config import settings
from src.models.hash import HashResult
from src.models.match import MatchResult

class HMAClient:
    """
    Client for interacting with the HMA service.
    """
    
    def __init__(self, base_url: str, api_key: Optional[str] = None):
        """
        Initialize the HMA client.
        
        Args:
            base_url: Base URL of the HMA service
            api_key: API key for the HMA service (if required)
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
    
    def hash_image(self, image_path: str) -> List[HashResult]:
        """
        Hash an image using the HMA service.
        
        Args:
            image_path: Path to the image file
            
        Returns:
            List[HashResult]: The hash results
        """
        try:
            # Prepare the file for upload
            with open(image_path, "rb") as f:
                files = {"file": (os.path.basename(image_path), f)}
                
                # Make the request to the HMA service
                response = self.session.post(
                    f"{self.base_url}/hashing/hash",
                    files=files,
                    headers={k: v for k, v in self.headers.items() if k != "Content-Type"}  # Remove Content-Type for multipart
                )
                
                # Check for errors
                response.raise_for_status()
                
                # Parse the response
                data = response.json()
                
                # Convert to HashResult objects
                results = []
                for algorithm, hash_value in data.items():
                    results.append(HashResult(
                        algorithm=algorithm,
                        hash_value=hash_value,
                        quality=None,  # HMA doesn't provide quality scores
                        metadata=None
                    ))
                
                return results
                
        except Exception as e:
            logger.error(f"Error hashing image: {str(e)}")
            raise
    
    def match_hash(self, hash_value: str, hash_type: str, threshold: float = 0.9) -> List[MatchResult]:
        """
        Match a hash against the HMA database.
        
        Args:
            hash_value: The hash value to match
            hash_type: The type of hash (e.g., 'pdq', 'md5')
            threshold: Threshold for considering a match (0.0 to 1.0)
            
        Returns:
            List[MatchResult]: The match results
        """
        try:
            # Prepare the request payload
            payload = {
                "hash": hash_value,
                "type": hash_type,
                "threshold": threshold
            }
            
            # Make the request to the HMA service
            response = self.session.post(
                f"{self.base_url}/matching/match",
                json=payload,
                headers=self.headers
            )
            
            # Check for errors
            response.raise_for_status()
            
            # Parse the response
            data = response.json()
            
            # Convert to MatchResult objects
            results = []
            for bank_id, matches in data.items():
                for match in matches:
                    results.append(MatchResult(
                        bank_id=bank_id,
                        bank_name=match.get("bank_name", bank_id),
                        distance=match.get("distance", 0.0),
                        hash_value=match.get("hash", ""),
                        metadata=match.get("metadata", {})
                    ))
            
            return results
                
        except Exception as e:
            logger.error(f"Error matching hash: {str(e)}")
            raise
    
    def report_to_ncmec(self, content_id: str, match_info: Dict, metadata: Optional[Dict] = None) -> Dict:
        """
        Report a match to NCMEC.
        
        Args:
            content_id: ID of the content to report
            match_info: Information about the match
            metadata: Additional metadata about the content
            
        Returns:
            Dict: The report result
        """
        try:
            # Prepare the request payload
            payload = {
                "content_id": content_id,
                "match_info": match_info,
                "metadata": metadata or {}
            }
            
            # Make the request to the HMA service
            response = self.session.post(
                f"{self.base_url}/curation/report_ncmec",
                json=payload,
                headers=self.headers
            )
            
            # Check for errors
            response.raise_for_status()
            
            # Parse the response
            data = response.json()
            
            return data
                
        except Exception as e:
            logger.error(f"Error reporting to NCMEC: {str(e)}")
            raise
    
    def get_status(self) -> Dict[str, Any]:
        """
        Get the status of the HMA service.
        
        Returns:
            Dict: The status information
        """
        try:
            # Make the request to the HMA service
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
            logger.error(f"Error getting HMA status: {str(e)}")
            raise
    
    def get_metrics(self) -> Dict[str, Any]:
        """
        Get metrics from the HMA service.
        
        Returns:
            Dict: The metrics information
        """
        try:
            # Make the request to the HMA service
            response = self.session.get(
                f"{self.base_url}/metrics",
                headers=self.headers
            )
            
            # Check for errors
            response.raise_for_status()
            
            # Parse the response
            data = response.json()
            
            return data
                
        except Exception as e:
            logger.error(f"Error getting HMA metrics: {str(e)}")
            raise 