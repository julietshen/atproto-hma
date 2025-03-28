"""
AT Protocol HMA Integration - Database Module
"""

import os
import datetime
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship

# Load database URL from environment variable
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@db:5432/atproto_hma")

# Create SQLAlchemy engine
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Models
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

# Database functions
def init_db():
    """Initialize the database by creating all tables."""
    Base.metadata.create_all(bind=engine)

def get_db():
    """Get a database session."""
    db = SessionLocal()
    try:
        return db
    finally:
        db.close()

def log_moderation_event(photo_id, author_did, match_result, match_type=None, 
                        match_score=None, action_taken=None, hma_response=None):
    """
    Log a moderation event in the database.
    
    Args:
        photo_id: The ID of the photo being moderated
        author_did: The DID of the author of the photo
        match_result: Whether the photo matched any known hashes
        match_type: The type of match (e.g., "pdq", "md5")
        match_score: The score of the match (e.g., PDQ distance)
        action_taken: What action was taken on the photo
        hma_response: The full response from the HMA service
    
    Returns:
        The created ModerationLog instance
    """
    db = get_db()
    try:
        log = ModerationLog(
            photo_id=photo_id,
            author_did=author_did,
            match_result=match_result,
            match_type=match_type,
            match_score=match_score,
            action_taken=action_taken,
            hma_response=hma_response,
            created_at=datetime.datetime.utcnow()
        )
        db.add(log)
        db.commit()
        db.refresh(log)
        return log
    finally:
        db.close()

def get_moderation_logs(limit=100, offset=0):
    """
    Get moderation logs with pagination.
    
    Args:
        limit: Maximum number of logs to return
        offset: Offset for pagination
        
    Returns:
        List of ModerationLog instances
    """
    db = get_db()
    try:
        return db.query(ModerationLog).order_by(
            ModerationLog.created_at.desc()
        ).limit(limit).offset(offset).all()
    finally:
        db.close()

def get_moderation_logs_for_photo(photo_id):
    """
    Get all moderation logs for a specific photo.
    
    Args:
        photo_id: The ID of the photo
        
    Returns:
        List of ModerationLog instances for the photo
    """
    db = get_db()
    try:
        return db.query(ModerationLog).filter(
            ModerationLog.photo_id == photo_id
        ).order_by(ModerationLog.created_at.desc()).all()
    finally:
        db.close() 