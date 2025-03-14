"""
AT Protocol HMA Integration - Database Migration
"""

import os
import sys
import logging
from sqlalchemy import create_engine, Column, String, MetaData, Table, inspect, text
from sqlalchemy.ext.declarative import declarative_base

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load database URL from environment variable
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@db:5432/atproto_hma")

# Create SQLAlchemy engine
engine = create_engine(DATABASE_URL)
metadata = MetaData()
Base = declarative_base()

def migrate():
    """
    Run database migrations.
    """
    logger.info("Starting database migration...")
    
    # Get inspector
    inspector = inspect(engine)
    
    # Check if moderation_logs table exists
    if 'moderation_logs' in inspector.get_table_names():
        logger.info("Found moderation_logs table")
        columns = [c['name'] for c in inspector.get_columns('moderation_logs')]
        
        # Check if altitude_task_id column exists
        if 'altitude_task_id' not in columns:
            logger.info("Adding altitude_task_id column to moderation_logs table")
            
            # Add altitude_task_id column
            moderation_logs = Table('moderation_logs', metadata, autoload_with=engine)
            column = Column('altitude_task_id', String, nullable=True)
            
            # Create the column using a connection
            with engine.connect() as conn:
                # Create the column
                column_name = column.compile(dialect=engine.dialect)
                column_type = column.type.compile(engine.dialect)
                conn.execute(text(f'ALTER TABLE moderation_logs ADD COLUMN {column_name} {column_type}'))
                
                # Create index on altitude_task_id
                conn.execute(text('CREATE INDEX ix_moderation_logs_altitude_task_id ON moderation_logs (altitude_task_id)'))
                
                # Commit the changes
                conn.commit()
            
            logger.info("Successfully added altitude_task_id column with index")
        else:
            logger.info("altitude_task_id column already exists")
    else:
        logger.info("moderation_logs table does not exist yet, skipping migration")
    
    logger.info("Database migration completed")

if __name__ == "__main__":
    migrate() 