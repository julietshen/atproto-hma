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
import base64
import uuid
from flask import Flask, request, jsonify, Response, render_template, send_from_directory
from dotenv import load_dotenv
from loguru import logger
import tempfile

# Import database module
from src.db import init_db, log_moderation_event, get_moderation_logs, get_moderation_logs_for_photo, update_altitude_task, get_moderation_logs_by_altitude_task

# Import service clients
from src.services.altitude_client import AltitudeClient

# Load environment variables
load_dotenv()

# Create Flask app
app = Flask(__name__, 
            template_folder='templates',
            static_folder='static')

# Configuration
HMA_API_URL = os.environ.get("HMA_API_URL", "http://app:5000")
ALTITUDE_API_URL = os.environ.get("ALTITUDE_API_URL", "http://altitude:80/api")
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@db:5432/atproto_hma")
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO")
PORT = int(os.environ.get("PORT", 3000))
HOST = os.environ.get("HOST", "0.0.0.0")

# Setup logging
logger.remove()
logger.add(sys.stderr, level=LOG_LEVEL)
logger.add("logs/app.log", rotation="10 MB", level=LOG_LEVEL)

# Initialize clients
altitude_client = AltitudeClient(ALTITUDE_API_URL)

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

@app.route("/", methods=["GET"])
def index():
    """
    Serve the test page
    """
    return render_template("test_page.html")

@app.route("/static/<path:path>")
def serve_static(path):
    """
    Serve static files
    """
    return send_from_directory("static", path)

@app.route("/health", methods=["GET"])
def health_check():
    """
    Health check endpoint.
    """
    altitude_health = altitude_client.check_health()
    if altitude_health:
        logger.info("Altitude service is healthy")
    else:
        logger.warning("Altitude service is not healthy or unavailable")
        
    return jsonify({"status": "healthy", "altitude_status": altitude_health})

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
        image_data = None
        image_data_b64 = None
        image_file_name = None
        author_did = request.form.get('author_did')
        photo_id = request.form.get('photo_id')
        
        # Check if we have form data with an image file
        if request.files and 'image' in request.files:
            logger.info("Processing image from form data")
            image_file = request.files['image']
            image_file_name = image_file.filename
            
            # Ensure we have author_did and photo_id
            if not author_did:
                author_did = "default_author_" + str(uuid.uuid4())[:8]
                logger.info(f"No author_did provided, using default: {author_did}")
                
            if not photo_id:
                photo_id = "default_photo_" + str(uuid.uuid4())
                logger.info(f"No photo_id provided, using default: {photo_id}")
            
            # Create a temporary file to store the image
            temp_file = tempfile.NamedTemporaryFile(delete=False)
            image_path = temp_file.name
            temp_file.close()
            
            try:
                # Save the image to the temporary file
                image_file.save(image_path)
                logger.info(f"Saved uploaded image to {image_path}")
                
                # Read the image data for potential Altitude submission
                with open(image_path, 'rb') as img_file:
                    image_data = img_file.read()
                    # Encode image for Altitude API (base64)
                    image_data_b64 = base64.b64encode(image_data).decode('utf-8')
                    logger.info(f"Read image data: {len(image_data)} bytes, base64 length: {len(image_data_b64)}")
                
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
            found_matches = False
            if 'pdq' in result:
                pdq_matches = result['pdq']
                for bank_name, bank_matches in pdq_matches.items():
                    for match in bank_matches:
                        found_matches = True
                        formatted_result["matches"].append({
                            "bank": bank_name,
                            "content_id": match.get("content_id"),
                            "distance": match.get("distance"),
                            "hash": match.get("hash", ""),
                            "metadata": match.get("metadata", {})
                        })
            
            # Log the moderation event
            if photo_id and author_did:
                log_moderation_event(
                    photo_id=photo_id,
                    author_did=author_did,
                    match_result=found_matches,
                    match_type="pdq",
                    match_score=formatted_result["matches"][0].get("distance") if found_matches and formatted_result["matches"] else None,
                    action_taken=None,
                    hma_response=json.dumps(result)
                )
                logger.info(f"Logged moderation event for photo {photo_id}")
                
                # Always create a review task in Altitude, regardless of matches
                # This ensures we have visual content in Altitude for every upload
                if image_data_b64:
                    try:
                        logger.info(f"Creating Altitude review task for photo {photo_id}, author {author_did}, with {len(formatted_result['matches'])} matches")
                        # Create review task in Altitude
                        match_info = formatted_result["matches"][0] if formatted_result["matches"] else {"hash": ""}
                        altitude_task = altitude_client.create_review_task(
                            image_data_b64,
                            photo_id,
                            author_did,
                            match_info
                        )
                        
                        if altitude_task:
                            # Update the log entry with Altitude task information
                            log_moderation_event(
                                photo_id=photo_id,
                                author_did=author_did,
                                match_result=found_matches,
                                match_type="pdq",
                                match_score=formatted_result["matches"][0].get("distance") if formatted_result["matches"] else None,
                                action_taken=None,
                                hma_response=json.dumps(result),
                                altitude_task_id=altitude_task.get("id"),
                                altitude_task_status="pending_review"
                            )
                            
                            logger.info(f"Created Altitude review task for photo {photo_id} with task ID: {altitude_task.get('id')}")
                            formatted_result["altitude"] = {
                                "task_created": True,
                                "task_id": altitude_task.get("id")
                            }
                        else:
                            logger.error(f"Failed to create Altitude review task for photo {photo_id}")
                            # Log without Altitude task information
                            log_moderation_event(
                                photo_id=photo_id,
                                author_did=author_did,
                                match_result=found_matches,
                                match_type="pdq",
                                match_score=formatted_result["matches"][0].get("distance") if formatted_result["matches"] else None,
                                action_taken=None,
                                hma_response=json.dumps(result)
                            )
                            
                            logger.error(f"Failed to create Altitude review task for photo {photo_id}")
                            formatted_result["altitude"] = {
                                "task_created": False,
                                "error": "Failed to create review task"
                            }
                    except Exception as e:
                        # Log without Altitude task information
                        log_moderation_event(
                            photo_id=photo_id,
                            author_did=author_did,
                            match_result=found_matches,
                            match_type="pdq",
                            match_score=formatted_result["matches"][0].get("distance") if formatted_result["matches"] else None,
                            action_taken=None,
                            hma_response=json.dumps(result)
                        )
                        
                        logger.error(f"Error creating Altitude review task: {str(e)}")
                        formatted_result["altitude"] = {
                            "task_created": False,
                            "error": str(e)
                        }
                else:
                    logger.error(f"No image data available to create Altitude task for photo {photo_id}")
                    formatted_result["altitude"] = {
                        "task_created": False,
                        "error": "No image data available"
                    }
            
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
                    "created_at": log.created_at.isoformat(),
                    "altitude": {
                        "task_id": log.altitude_task_id,
                        "task_status": log.altitude_task_status,
                        "created_at": log.altitude_task_created_at.isoformat() if log.altitude_task_created_at else None
                    } if log.altitude_task_id else None
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
                    "created_at": log.created_at.isoformat(),
                    "altitude": {
                        "task_id": log.altitude_task_id,
                        "task_status": log.altitude_task_status,
                        "created_at": log.altitude_task_created_at.isoformat() if log.altitude_task_created_at else None
                    } if log.altitude_task_id else None
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

@app.route("/api/v1/altitude/task/<task_id>", methods=["GET"])
def get_altitude_task(task_id):
    """
    Get the status of an Altitude review task.
    
    Args:
        task_id: The Altitude task ID
    """
    try:
        logger.info(f"Getting status of Altitude task {task_id}")
        
        # Get task status from Altitude
        task_status = altitude_client.get_task_status(task_id)
        
        if task_status:
            return jsonify({
                "success": True,
                "task": task_status
            })
        else:
            return jsonify({
                "success": False,
                "error": f"Failed to get status for task {task_id}"
            }), 404
    except Exception as e:
        logger.error(f"Error getting Altitude task status: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route("/api/v1/altitude/health", methods=["GET"])
def check_altitude_health():
    """
    Check the health of the Altitude service.
    """
    try:
        health_status = altitude_client.check_health()
        
        return jsonify({
            "success": True,
            "healthy": health_status
        })
    except Exception as e:
        logger.error(f"Error checking Altitude health: {e}")
        return jsonify({
            "success": False,
            "healthy": False,
            "error": str(e)
        }), 500

@app.route("/api/v1/altitude/webhook", methods=["POST"])
def altitude_webhook():
    """
    Receive callbacks from Altitude service.
    
    This endpoint processes verdicts and status updates for content reviewed in Altitude.
    """
    try:
        # Process webhook data
        data = request.json
        logger.info(f"Received Altitude webhook: {data}")
        
        # Expected format:
        # {
        #     "client_context": "...", (JSON string containing photo_id and author_did)
        #     "decision": "APPROVE" or "BLOCK",
        #     "decision_time": "2023-01-01T00:00:00Z"
        # }
        
        if not data or 'client_context' not in data or 'decision' not in data:
            logger.error("Invalid Altitude webhook data: missing required fields")
            return jsonify({"error": "Invalid webhook data"}), 400
        
        # Parse client_context to get photo_id and author_did
        try:
            client_context = json.loads(data['client_context'])
            photo_id = client_context.get('photo_id')
            author_did = client_context.get('author_did')
            
            if not photo_id or not author_did:
                logger.error("Invalid client_context: missing photo_id or author_did")
                return jsonify({"error": "Invalid client_context"}), 400
                
            # Update the moderation log with the Altitude decision
            action_taken = "approve" if data['decision'] == "APPROVE" else "block"
            
            # Get the moderation logs for this photo
            logs = get_moderation_logs_for_photo(photo_id)
            
            if logs:
                # Update the latest log entry
                log = logs[0]
                
                # Update Altitude task information
                success = update_altitude_task(
                    photo_id=photo_id,
                    altitude_task_id=log.altitude_task_id,
                    altitude_task_status=action_taken
                )
                
                if success:
                    logger.info(f"Updated moderation log for photo {photo_id} with Altitude decision: {action_taken}")
                    return jsonify({"status": "success"}), 200
                else:
                    logger.error(f"Failed to update moderation log for photo {photo_id}")
                    return jsonify({"error": "Failed to update moderation log"}), 500
            else:
                logger.error(f"No moderation logs found for photo {photo_id}")
                return jsonify({"error": "No moderation logs found"}), 404
                
        except json.JSONDecodeError:
            logger.error(f"Invalid client_context JSON: {data.get('client_context')}")
            return jsonify({"error": "Invalid client_context JSON"}), 400
            
    except Exception as e:
        logger.error(f"Error processing Altitude webhook: {e}")
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