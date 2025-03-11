"""
AT Protocol HMA Integration - Main Entry Point
A simple Flask application that serves as a bridge between AT Protocol and HMA
"""

import os
import sys
import logging
import json
import requests
from flask import Flask, request, jsonify
from dotenv import load_dotenv
from loguru import logger

# Import database module
from src.db import init_db, log_moderation_event, get_moderation_logs, get_moderation_logs_for_photo

# Load environment variables
load_dotenv()

# Create Flask app
app = Flask(__name__)

# Configuration
HMA_API_URL = os.environ.get("HMA_API_URL", "http://hma:5000")
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@db:5432/atproto_hma")
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO")
PORT = int(os.environ.get("PORT", 3000))
HOST = os.environ.get("HOST", "0.0.0.0")

# Setup logging
logger.remove()
logger.add(sys.stderr, level=LOG_LEVEL)
logger.add("logs/app.log", rotation="10 MB", level=LOG_LEVEL)

# Initialize database
_db_initialized = False

@app.before_request
def setup():
    global _db_initialized
    if not _db_initialized:
        init_db()
        logger.info("Database initialized")
        _db_initialized = True

# API Endpoints

@app.route("/health", methods=["GET"])
def health_check():
    """
    Health check endpoint.
    """
    return jsonify({"status": "healthy"})

@app.route("/api/v1/hash", methods=["POST"])
def hash_image():
    """
    Hash an image using HMA service.
    """
    try:
        # Forward request to HMA service - updated to use the correct endpoint
        response = requests.post(f"{HMA_API_URL}/h/hash", json=request.json)
        
        # Check if we got a proper response
        if response.status_code == 404:
            logger.warning(f"HMA endpoint /h/hash returned 404, trying alternative endpoint")
            # Try multipart/form-data approach if needed
            files = {}
            data = request.json
            
            # If image is base64 encoded in the request, decode it and add as file
            if 'image_data' in data:
                import base64
                from io import BytesIO
                
                image_data = base64.b64decode(data['image_data'])
                files = {'file': ('image.jpg', BytesIO(image_data), 'image/jpeg')}
                
                response = requests.post(f"{HMA_API_URL}/h/hash", files=files)
        
        result = response.json() if response.headers.get('content-type', '').startswith('application/json') else {"error": "Non-JSON response from HMA"}
        
        # Log the event if author_did and photo_id are provided
        data = request.json
        if 'author_did' in data and 'photo_id' in data:
            log_moderation_event(
                photo_id=data['photo_id'],
                author_did=data['author_did'],
                match_result=bool(result.get('matches', [])),
                match_type="pdq",
                match_score=result.get('distance', None),
                hma_response=json.dumps(result)
            )
            logger.info(f"Logged moderation event for photo {data['photo_id']}")
        
        return jsonify(result), response.status_code
    except Exception as e:
        logger.error(f"Error hashing image: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/v1/hash/url", methods=["POST"])
def hash_image_url():
    """
    Hash an image from a URL using HMA service.
    """
    try:
        # Forward request to HMA service - using a form-based approach
        data = request.json
        
        if 'url' in data:
            # Use form data with URL parameter
            form_data = {'url': data['url']}
            response = requests.post(f"{HMA_API_URL}/h/hash", data=form_data)
        else:
            # Fall back to JSON
            response = requests.post(f"{HMA_API_URL}/h/hash", json=data)
        
        result = response.json() if response.headers.get('content-type', '').startswith('application/json') else {"error": "Non-JSON response from HMA"}
        
        # Log the event if author_did and photo_id are provided
        if 'author_did' in data and 'photo_id' in data:
            log_moderation_event(
                photo_id=data['photo_id'],
                author_did=data['author_did'],
                match_result=bool(result.get('matches', [])),
                match_type="pdq",
                match_score=result.get('distance', None),
                hma_response=json.dumps(result)
            )
            logger.info(f"Logged moderation event for photo {data['photo_id']}")
        
        return jsonify(result), response.status_code
    except Exception as e:
        logger.error(f"Error hashing image from URL: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/v1/match", methods=["POST"])
def match_hash():
    """
    Match a hash against the HMA database.
    """
    try:
        # Forward request to HMA service - updated to use the correct endpoint
        response = requests.post(f"{HMA_API_URL}/m/compare", json=request.json)
        result = response.json() if response.headers.get('content-type', '').startswith('application/json') else {"error": "Non-JSON response from HMA"}
        
        # Log the event if author_did and photo_id are provided
        data = request.json
        if 'author_did' in data and 'photo_id' in data:
            log_moderation_event(
                photo_id=data['photo_id'],
                author_did=data['author_did'],
                match_result=bool(result.get('matches', [])),
                match_type=data.get('hash_type', 'pdq'),
                match_score=result.get('distance', None),
                hma_response=json.dumps(result)
            )
            logger.info(f"Logged moderation event for photo {data['photo_id']}")
        
        return jsonify(result), response.status_code
    except Exception as e:
        logger.error(f"Error matching hash: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/v1/webhook/callback", methods=["POST"])
def webhook_callback():
    """
    Receive callbacks from HMA service.
    """
    try:
        # Process webhook data
        data = request.json
        logger.info(f"Received webhook callback: {data}")
        
        # Log the event if it contains photo information
        if 'photo_id' in data and 'author_did' in data:
            log_moderation_event(
                photo_id=data['photo_id'],
                author_did=data['author_did'],
                match_result=data.get('match_result', False),
                match_type=data.get('match_type'),
                match_score=data.get('match_score'),
                action_taken=data.get('action'),
                hma_response=json.dumps(data)
            )
            logger.info(f"Logged webhook callback for photo {data['photo_id']}")
        
        return jsonify({"status": "success"}), 200
    except Exception as e:
        logger.error(f"Error processing webhook callback: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/v1/logs", methods=["GET"])
def get_logs():
    """
    Get moderation logs with pagination.
    """
    try:
        limit = request.args.get('limit', 100, type=int)
        offset = request.args.get('offset', 0, type=int)
        logs = get_moderation_logs(limit, offset)
        return jsonify({
            "logs": [
                {
                    "id": log.id,
                    "photo_id": log.photo_id,
                    "author_did": log.author_did,
                    "match_result": log.match_result,
                    "match_type": log.match_type,
                    "match_score": log.match_score,
                    "action_taken": log.action_taken,
                    "created_at": log.created_at.isoformat()
                } for log in logs
            ],
            "count": len(logs),
            "limit": limit,
            "offset": offset
        }), 200
    except Exception as e:
        logger.error(f"Error retrieving logs: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/v1/logs/<photo_id>", methods=["GET"])
def get_logs_for_photo(photo_id):
    """
    Get moderation logs for a specific photo.
    """
    try:
        logs = get_moderation_logs_for_photo(photo_id)
        return jsonify({
            "logs": [
                {
                    "id": log.id,
                    "photo_id": log.photo_id,
                    "author_did": log.author_did,
                    "match_result": log.match_result,
                    "match_type": log.match_type,
                    "match_score": log.match_score,
                    "action_taken": log.action_taken,
                    "created_at": log.created_at.isoformat()
                } for log in logs
            ],
            "count": len(logs)
        }), 200
    except Exception as e:
        logger.error(f"Error retrieving logs for photo {photo_id}: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    # Run the app in development mode
    logger.info(f"Starting AT Protocol HMA Integration service on {HOST}:{PORT}")
    app.run(host=HOST, port=PORT, debug=(LOG_LEVEL.lower() == "debug"))
else:
    # For production with Gunicorn
    gunicorn_logger = logging.getLogger('gunicorn.error')
    app.logger.handlers = gunicorn_logger.handlers
    app.logger.setLevel(gunicorn_logger.level) 