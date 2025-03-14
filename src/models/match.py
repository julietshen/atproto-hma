"""
AT Protocol HMA Integration - Match Models
"""

from typing import Dict, Optional, Any
from dataclasses import dataclass

@dataclass
class MatchResult:
    """
    Represents the result of a match operation.
    """
    bank_id: str
    bank_name: str
    distance: float
    hash_value: str
    metadata: Dict[str, Any] 