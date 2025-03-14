"""
AT Protocol HMA Integration - Hash Models
"""

from typing import Dict, Optional, Any
from dataclasses import dataclass

@dataclass
class HashResult:
    """
    Represents the result of a hash operation.
    """
    algorithm: str
    hash_value: str
    quality: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None 