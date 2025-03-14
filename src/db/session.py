"""
AT Protocol HMA Integration - Database Session
"""

import os
import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.db.models import Base, ModerationLog

# Load database URL from environment variable
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@db:5432/atproto_hma")

# Create SQLAlchemy engine
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

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

def update_altitude_task(photo_id, task_id):
    """
    Update a moderation log with an Altitude task ID.
    
    Args:
        photo_id: The ID of the photo
        task_id: The Altitude task ID
        
    Returns:
        The updated ModerationLog instance or None if not found
    """
    db = get_db()
    try:
        log = db.query(ModerationLog).filter(
            ModerationLog.photo_id == photo_id
        ).order_by(ModerationLog.created_at.desc()).first()
        
        if log:
            log.altitude_task_id = task_id
            db.commit()
            db.refresh(log)
        return log
    finally:
        db.close()

def get_moderation_logs_by_altitude_task(task_id):
    """
    Get all moderation logs for a specific Altitude task.
    
    Args:
        task_id: The Altitude task ID
        
    Returns:
        List of ModerationLog instances for the task
    """
    db = get_db()
    try:
        return db.query(ModerationLog).filter(
            ModerationLog.altitude_task_id == task_id
        ).order_by(ModerationLog.created_at.desc()).all()
    finally:
        db.close() 