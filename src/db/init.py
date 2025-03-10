"""
AT Protocol HMA Integration - Database Initialization
"""

import os
import sys
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Text, LargeBinary
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
from loguru import logger

from src.core.config import settings

# Create the base class for declarative models
Base = declarative_base()

# Define the models
class Hash(Base):
    """
    Hash model for storing image hashes.
    """
    __tablename__ = "hashes"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    hash_value = Column(String(255), nullable=False, index=True)
    algorithm = Column(String(50), nullable=False)
    quality = Column(Float, nullable=True)
    content_id = Column(String(255), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.now)
    metadata = Column(Text, nullable=True)

class Match(Base):
    """
    Match model for storing hash matches.
    """
    __tablename__ = "matches"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    hash_id = Column(Integer, ForeignKey("hashes.id"), nullable=False)
    bank_id = Column(String(255), nullable=False)
    bank_name = Column(String(255), nullable=False)
    distance = Column(Float, nullable=False)
    matched_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.now)
    metadata = Column(Text, nullable=True)
    
    hash = relationship("Hash", backref="matches")

class Action(Base):
    """
    Action model for storing actions taken on matches.
    """
    __tablename__ = "actions"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    action_id = Column(String(255), nullable=False, unique=True)
    action_type = Column(String(50), nullable=False)
    content_id = Column(String(255), nullable=False, index=True)
    success = Column(Boolean, nullable=False, default=False)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    metadata = Column(Text, nullable=True)

def init_db():
    """
    Initialize the database.
    """
    try:
        # Create the engine
        engine = create_engine(settings.DATABASE_URL)
        
        # Create the tables
        Base.metadata.create_all(engine)
        
        # Create a session
        Session = sessionmaker(bind=engine)
        session = Session()
        
        logger.info("Database initialized successfully")
        
        return session
        
    except Exception as e:
        logger.error(f"Error initializing database: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    # Initialize the database when run directly
    init_db() 