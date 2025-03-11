"""
AT Protocol HMA Integration - Models
Simple Python classes to represent data structures used in the API.
"""

from typing import List, Dict, Any, Optional


class HashRequest:
    """
    Request model for image hashing.
    """
    def __init__(self, 
                 image_data: Optional[str] = None, 
                 image_url: Optional[str] = None,
                 author_did: Optional[str] = None,
                 photo_id: Optional[str] = None,
                 metadata: Optional[Dict[str, Any]] = None):
        self.image_data = image_data
        self.image_url = image_url
        self.author_did = author_did
        self.photo_id = photo_id
        self.metadata = metadata or {}

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'HashRequest':
        """Create a HashRequest instance from a dictionary."""
        return cls(
            image_data=data.get('image_data'),
            image_url=data.get('image_url'),
            author_did=data.get('author_did'),
            photo_id=data.get('photo_id'),
            metadata=data.get('metadata', {})
        )


class MatchRequest:
    """
    Request model for hash matching.
    """
    def __init__(self,
                 hash_value: str,
                 hash_type: str = 'pdq',
                 author_did: Optional[str] = None,
                 photo_id: Optional[str] = None,
                 threshold: float = 0.9,
                 metadata: Optional[Dict[str, Any]] = None):
        self.hash_value = hash_value
        self.hash_type = hash_type
        self.author_did = author_did
        self.photo_id = photo_id
        self.threshold = threshold
        self.metadata = metadata or {}

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'MatchRequest':
        """Create a MatchRequest instance from a dictionary."""
        return cls(
            hash_value=data.get('hash_value', ''),
            hash_type=data.get('hash_type', 'pdq'),
            author_did=data.get('author_did'),
            photo_id=data.get('photo_id'),
            threshold=data.get('threshold', 0.9),
            metadata=data.get('metadata', {})
        )


class ActionRequest:
    """
    Request model for taking action on content.
    """
    def __init__(self,
                 content_uri: str,
                 action_type: str,
                 reason: str,
                 metadata: Optional[Dict[str, Any]] = None):
        self.content_uri = content_uri
        self.action_type = action_type
        self.reason = reason
        self.metadata = metadata or {}

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ActionRequest':
        """Create an ActionRequest instance from a dictionary."""
        return cls(
            content_uri=data.get('content_uri', ''),
            action_type=data.get('action_type', ''),
            reason=data.get('reason', ''),
            metadata=data.get('metadata', {})
        )


class WebhookRequest:
    """
    Request model for webhook callbacks.
    """
    def __init__(self,
                 event_type: str,
                 content_uri: Optional[str] = None,
                 author_did: Optional[str] = None,
                 photo_id: Optional[str] = None,
                 match_result: bool = False,
                 match_type: Optional[str] = None,
                 match_score: Optional[float] = None,
                 action: Optional[str] = None,
                 payload: Optional[Dict[str, Any]] = None):
        self.event_type = event_type
        self.content_uri = content_uri
        self.author_did = author_did
        self.photo_id = photo_id
        self.match_result = match_result
        self.match_type = match_type
        self.match_score = match_score
        self.action = action
        self.payload = payload or {}

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'WebhookRequest':
        """Create a WebhookRequest instance from a dictionary."""
        return cls(
            event_type=data.get('event_type', ''),
            content_uri=data.get('content_uri'),
            author_did=data.get('author_did'),
            photo_id=data.get('photo_id'),
            match_result=data.get('match_result', False),
            match_type=data.get('match_type'),
            match_score=data.get('match_score'),
            action=data.get('action'),
            payload=data.get('payload', {})
        ) 