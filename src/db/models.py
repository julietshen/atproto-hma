"""
AT Protocol HMA Integration - Database Models
"""

import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class ModerationLog(Base):
    """
    Model for storing moderation log entries.
    """
    __tablename__ = "moderation_logs"

    id = Column(Integer, primary_key=True, index=True)
    photo_id = Column(String, index=True)
    author_did = Column(String, index=True)
    match_result = Column(Boolean, default=False)
    match_type = Column(String, nullable=True)
    match_score = Column(Integer, nullable=True)
    action_taken = Column(String, nullable=True)
    hma_response = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    processed_at = Column(DateTime, nullable=True) 