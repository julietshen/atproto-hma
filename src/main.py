"""
AT Protocol HMA Integration - Main Entry Point
A simple Flask application that serves as a bridge between AT Protocol and HMA
"""

import os
import sys
import logging
import json
import requests
import time
from flask import Flask, request, jsonify, Response
from dotenv import load_dotenv
from loguru import logger
import tempfile

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
    Hash an image and return the hash.
    
    This endpoint accepts a form data with an image file.
    """
    try:
        logger.info("Received hash request")
        
        # Check if we have form data with an image file
        if request.files and 'image' in request.files:
            logger.info("Processing image from form data")
            image_file = request.files['image']
            
            # Create a temporary file to store the image
            temp_file = tempfile.NamedTemporaryFile(delete=False)
            image_path = temp_file.name
            temp_file.close()
            
            try:
                # Save the image to the temporary file
                image_file.save(image_path)
                logger.info(f"Saved uploaded image to {image_path}")
                
                # Get the content type
                content_type = image_file.content_type or 'application/octet-stream'
                
                # Forward the file to HMA service
                files = {'photo': (image_file.filename, open(image_path, 'rb'), content_type)}
                data = {'content_type': 'photo'}
                
                # Use the correct endpoint
                response = requests.post(f"{HMA_API_URL}/h/hash", files=files, data=data)
                
                # Log the response status
                logger.info(f"HMA response status: {response.status_code}")
                logger.info(f"HMA response content: {response.text[:500]}")
                
                # Clean up the temporary file
                os.unlink(image_path)
            except Exception as e:
                # Make sure to clean up the temp file even if an error occurs
                if os.path.exists(image_path):
                    os.unlink(image_path)
                raise e
                
        # If no form data, try to forward raw data
        else:
            logger.warning("No image file found in request, forwarding raw request")
            content_type = request.headers.get('Content-Type', 'application/octet-stream')
            
            # Forward raw request to HMA service
            headers = {
                'Content-Type': content_type,
                'Authorization': request.headers.get('Authorization', '')
            }
            
            # Use the correct endpoint
            response = requests.post(
                f"{HMA_API_URL}/h/hash", 
                data=request.get_data(),
                headers=headers
            )
        
        # Process the response
        logger.info(f"HMA response status: {response.status_code}")
        logger.info(f"HMA response content: {response.text[:500]}")
        
        # Check if we got a proper response
        if response.status_code == 200 and response.headers.get('content-type', '').startswith('application/json'):
            result = response.json()
            
            # Extract the hash from the result
            if 'pdq' in result:
                # Format the response for the client
                formatted_result = {
                    "success": True,
                    "hash": result['pdq'],
                    "matches": [],
                    "hma_status": "success"
                }
                return jsonify(formatted_result)
            else:
                # Return the result as-is
                return jsonify(result)
        else:
            # Error response
            logger.error(f"Error response from HMA service: {response.status_code}")
            result = {
                "success": False,
                "hash": None,
                "matches": [],
                "hma_status": "error",
                "hma_status_code": response.status_code,
                "hma_error_message": "HMA service unavailable or returned an error"
            }
        
        # Always return 200 to avoid breaking the application flow
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Error hashing image: {e}")
        return jsonify({
            "success": False,
            "hash": None,
            "matches": [],
            "hma_status": "bridge_error",
            "hma_error_message": str(e)
        }), 200

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
        
        if response.status_code == 200 and response.headers.get('content-type', '').startswith('application/json'):
            result = response.json()
        else:
            # Handle error responses
            result = {
                "success": False,
                "hash": None,
                "matches": [],
                "hma_status": "error",
                "hma_status_code": response.status_code,
                "hma_error_message": "HMA service unavailable or returned an error"
            }
        
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
        
        # Always return 200 to avoid breaking the application flow
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Error hashing image from URL: {e}")
        return jsonify({
            "success": False,
            "hash": None,
            "matches": [],
            "hma_status": "bridge_error",
            "hma_error_message": str(e)
        }), 200

@app.route("/api/v1/match", methods=["POST"])
def match_hash():
    """
    Match an image against the HMA database.
    
    This endpoint accepts a form data with an image file.
    """
    try:
        logger.info("Received match request")
        
        # Check if we have form data with an image file
        if request.files and 'image' in request.files:
            logger.info("Processing image from form data")
            image_file = request.files['image']
            
            # Create a temporary file to store the image
            temp_file = tempfile.NamedTemporaryFile(delete=False)
            image_path = temp_file.name
            temp_file.close()
            
            try:
                # Save the image to the temporary file
                image_file.save(image_path)
                logger.info(f"Saved uploaded image to {image_path}")
                
                # Get the content type
                content_type = image_file.content_type or 'application/octet-stream'
                
                # Forward the file to HMA service for matching
                files = {'photo': (image_file.filename, open(image_path, 'rb'), content_type)}
                data = {
                    'content_type': 'photo',
                    'banks': 'SAMPLE_IMAGES',  # Specify the bank to match against
                    'threshold': '0.8'         # Match threshold (0-1)
                }
                
                # Use the correct endpoint for lookup
                response = requests.post(f"{HMA_API_URL}/m/lookup", files=files, data=data)
                
                # Log the response
                logger.info(f"HMA response status: {response.status_code}")
                logger.info(f"HMA response content: {response.text[:500]}")
                
                # Clean up the temporary file
                os.unlink(image_path)
            except Exception as e:
                # Make sure to clean up the temp file even if an error occurs
                if os.path.exists(image_path):
                    os.unlink(image_path)
                raise e
        else:
            # We need an image file for matching
            return jsonify({
                "success": False,
                "matches": [],
                "error": "No image file provided in the request. Please upload an image file."
            }), 400
        
        # Process the response
        if response.status_code == 200 and response.headers.get('content-type', '').startswith('application/json'):
            result = response.json()
            
            # Format the response for the client
            formatted_result = {
                "success": True,
                "matches": []
            }
            
            # Extract matches from the HMA response
            if 'pdq' in result:
                pdq_matches = result['pdq']
                for bank_name, bank_matches in pdq_matches.items():
                    for match in bank_matches:
                        formatted_result["matches"].append({
                            "bank": bank_name,
                            "content_id": match.get("content_id"),
                            "distance": match.get("distance"),
                            "hash": match.get("hash", ""),
                            "metadata": match.get("metadata", {})
                        })
            
            logger.info(f"Formatted match result: {formatted_result}")
            return jsonify(formatted_result)
        else:
            # Handle error responses
            error_text = response.text
            logger.error(f"Error from HMA service: {error_text}")
            result = {
                "success": False,
                "matches": [],
                "error": f"HMA service returned an error: {response.status_code}",
                "hma_error": error_text[:200]
            }
            return jsonify(result)
    except Exception as e:
        logger.error(f"Error in match_hash: {e}")
        return jsonify({
            "success": False,
            "matches": [],
            "error": str(e)
        }), 500

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

# Routes for admin operations

@app.route("/api/v1/admin/banks", methods=["GET", "POST"])
def admin_banks():
    """
    Admin route to create or list banks.
    
    GET: List all banks
    POST: Create a new bank
    """
    try:
        # Forward request to HMA service with appropriate endpoint
        if request.method == "GET":
            response = requests.get(f"{HMA_API_URL}/c/banks")
        else:  # POST
            response = requests.post(f"{HMA_API_URL}/c/banks", json=request.json)
        
        # Log the response
        logger.info(f"HMA banks response status: {response.status_code}")
        
        # Return the response from HMA
        return Response(
            response.content,
            status=response.status_code,
            content_type=response.headers.get('Content-Type', 'application/json')
        )
    except Exception as e:
        logger.error(f"Error in admin banks route: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/api/v1/admin/bank/<bank_name>", methods=["GET", "PUT", "DELETE"])
def admin_bank(bank_name):
    """
    Admin route to manage a specific bank.
    
    GET: Get bank details
    PUT: Update bank
    DELETE: Delete bank
    """
    try:
        # Forward request to HMA service with appropriate endpoint
        if request.method == "GET":
            response = requests.get(f"{HMA_API_URL}/c/bank/{bank_name}")
        elif request.method == "PUT":
            response = requests.put(f"{HMA_API_URL}/c/bank/{bank_name}", json=request.json)
        else:  # DELETE
            response = requests.delete(f"{HMA_API_URL}/c/bank/{bank_name}")
        
        # Log the response
        logger.info(f"HMA bank response status: {response.status_code}")
        
        # Return the response from HMA
        return Response(
            response.content,
            status=response.status_code,
            content_type=response.headers.get('Content-Type', 'application/json')
        )
    except Exception as e:
        logger.error(f"Error in admin bank route: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/api/v1/admin/bank/<bank_name>/signal", methods=["POST"])
def admin_bank_add_signal(bank_name):
    """
    Admin route to add a signal to a bank.
    """
    try:
        # Get the signal data from the request
        data = request.json
        logger.info(f"Received add signal request with data: {data}")
        
        # Ensure the hash data is properly formatted for HMA service
        formatted_data = data.copy()
        
        # Convert 'hash' to 'pdq' if present
        if 'hash' in formatted_data and 'pdq' not in formatted_data:
            formatted_data['pdq'] = formatted_data.pop('hash')
        
        logger.info(f"Formatted request data for HMA: {formatted_data}")
        
        # Forward request to HMA service
        response = requests.post(f"{HMA_API_URL}/c/bank/{bank_name}/signal", json=formatted_data)
        
        # Log the response
        logger.info(f"HMA add signal response status: {response.status_code}")
        logger.info(f"HMA add signal response content: {response.text[:500]}")
        
        # Return the response from HMA
        return Response(
            response.content,
            status=response.status_code,
            content_type=response.headers.get('Content-Type', 'application/json')
        )
    except Exception as e:
        logger.error(f"Error in admin add signal route: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/api/v1/admin/bank/<bank_name>/content", methods=["POST"])
def admin_bank_add_content(bank_name):
    """
    Admin route to add content to a bank.
    """
    try:
        logger.info(f"Received add content request for bank: {bank_name}")
        
        # Check if we have form data
        if request.files and ('file' in request.files or 'photo' in request.files):
            # Process form data with file
            image_file = request.files.get('file') or request.files.get('photo')
            
            # Save the file to a temporary file
            image_fd, image_path = tempfile.mkstemp()
            try:
                image_file.save(image_path)
                logger.info(f"Saved uploaded image to temporary file: {image_path}")
                
                # Create a form with the image
                with open(image_path, 'rb') as f:
                    # Use the correct field name 'photo' instead of 'file'
                    files = {'photo': (image_file.filename, f, image_file.content_type)}
                    data = {'content_type': 'photo'}  # Specify the content type
                    
                    # Forward the file to HMA
                    response = requests.post(
                        f"{HMA_API_URL}/c/bank/{bank_name}/content", 
                        files=files,
                        data=data
                    )
                
                # Clean up the temporary file
                os.unlink(image_path)
            except Exception as e:
                # Make sure to clean up the temp file even if an error occurs
                if os.path.exists(image_path):
                    os.unlink(image_path)
                raise e
        else:
            # Forward JSON request
            response = requests.post(f"{HMA_API_URL}/c/bank/{bank_name}/content", json=request.json)
        
        # Log the response
        logger.info(f"HMA add content response status: {response.status_code}")
        logger.info(f"HMA add content response content: {response.text[:500]}")
        
        # Return the response from HMA
        return Response(
            response.content,
            status=response.status_code,
            content_type=response.headers.get('Content-Type', 'application/json')
        )
    except Exception as e:
        logger.error(f"Error in admin add content route: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

if __name__ == "__main__":
    # Run the app in development mode
    logger.info(f"Starting AT Protocol HMA Integration service on {HOST}:{PORT}")
    app.run(host=HOST, port=PORT, debug=(LOG_LEVEL.lower() == "debug"))
else:
    # For production with Gunicorn
    gunicorn_logger = logging.getLogger('gunicorn.error')
    app.logger.handlers = gunicorn_logger.handlers
    app.logger.setLevel(gunicorn_logger.level) 