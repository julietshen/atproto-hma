/**
 * PerchPics HMA Service
 * 
 * This service provides integration with Meta's Hasher-Matcher-Actioner (HMA)
 * for content moderation of uploaded photos.
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';

// Configuration - In a production app, these would come from environment variables
const config = {
  hma: {
    apiUrl: process.env.HMA_API_URL || 'http://localhost:5000',
    apiKey: process.env.HMA_API_KEY || 'test-api-key',
    matchThreshold: process.env.HMA_MATCH_THRESHOLD || 0.8,
    webhookUrl: process.env.HMA_WEBHOOK_URL || 'http://localhost:3001/webhooks/hma'
  },
  logging: {
    directory: process.env.HMA_LOG_DIR || './logs/hma',
    enabled: true
  }
};

// Ensure log directory exists
if (config.logging.enabled) {
  if (!fs.existsSync(config.logging.directory)) {
    fs.mkdirSync(config.logging.directory, { recursive: true });
  }
}

/**
 * Log HMA-related events for audit purposes
 */
function logEvent(type, data) {
  if (!config.logging.enabled) return;
  
  const logEntry = {
    timestamp: new Date().toISOString(),
    type,
    data
  };
  
  const logFilePath = path.join(
    config.logging.directory, 
    `hma-${new Date().toISOString().split('T')[0]}.log`
  );
  
  fs.appendFileSync(
    logFilePath, 
    JSON.stringify(logEntry) + '\n', 
    { encoding: 'utf8' }
  );
}

/**
 * Hash an image using the HMA service
 */
async function hashImage(imagePath) {
  try {
    // Read the image file as a buffer
    const imageBuffer = fs.readFileSync(imagePath);
    
    // Create form data with the image
    const formData = new FormData();
    formData.append('image', imageBuffer, {
      filename: path.basename(imagePath),
      contentType: 'image/jpeg' // Adjust based on actual image type
    });
    
    // Call the HMA hash endpoint
    const response = await fetch(`${config.hma.apiUrl}/api/v1/hash`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.hma.apiKey}`
      },
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`HMA hash request failed: ${response.status} ${response.statusText}`);
    }
    
    const hashResult = await response.json();
    logEvent('hash_success', { imagePath, hashResult });
    
    return hashResult;
  } catch (error) {
    console.error('Error hashing image:', error);
    logEvent('hash_error', { imagePath, error: error.message });
    throw error;
  }
}

/**
 * Match hashes against the HMA database
 */
async function matchHash(hashData) {
  try {
    // Call the HMA match endpoint
    const response = await fetch(`${config.hma.apiUrl}/api/v1/match`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.hma.apiKey}`
      },
      body: JSON.stringify({
        hashes: [hashData]
      })
    });
    
    if (!response.ok) {
      throw new Error(`HMA match request failed: ${response.status} ${response.statusText}`);
    }
    
    const matchResult = await response.json();
    logEvent('match_success', { hashData, matchResult });
    
    return matchResult;
  } catch (error) {
    console.error('Error matching hash:', error);
    logEvent('match_error', { hashData, error: error.message });
    throw error;
  }
}

/**
 * Send a webhook notification to the HMA webhook endpoint
 */
async function sendWebhookNotification(photoId, matchResult) {
  try {
    const response = await fetch(config.hma.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        photoId,
        matchResult,
        timestamp: new Date().toISOString()
      })
    });
    
    if (!response.ok) {
      throw new Error(`Webhook notification failed: ${response.status} ${response.statusText}`);
    }
    
    logEvent('webhook_sent', { photoId, matchResult });
    return true;
  } catch (error) {
    console.error('Error sending webhook notification:', error);
    logEvent('webhook_error', { photoId, matchResult, error: error.message });
    return false;
  }
}

/**
 * Process an image through the HMA pipeline
 */
async function processImage(imagePath, imageInfo) {
  try {
    // Step 1: Hash the image
    const hashResult = await hashImage(imagePath);
    
    // Step 2: Match the hash against HMA databases
    const matchResult = await matchHash(hashResult);
    
    // Step 3: Determine if action is needed based on matches
    const significantMatches = matchResult.matches.filter(
      match => (1.0 - match.distance) >= config.hma.matchThreshold
    );
    
    const result = {
      matched: significantMatches.length > 0,
      action: significantMatches.length > 0 ? 'review' : 'none',
      matches: significantMatches
    };
    
    // Log the result
    logEvent(result.matched ? 'significant_match' : 'no_match', { 
      imageInfo, 
      hashResult, 
      matches: significantMatches 
    });
    
    // Send webhook notification asynchronously (don't await)
    if (result.matched) {
      sendWebhookNotification(imageInfo.photoId, result);
    }
    
    return result;
  } catch (error) {
    console.error('Error processing image through HMA:', error);
    logEvent('process_error', { imagePath, error: error.message });
    
    // Return a default response that won't block the upload
    return {
      matched: false,
      error: error.message,
      action: 'none',
      matches: []
    };
  }
}

export default {
  processImage,
  hashImage,
  matchHash,
  sendWebhookNotification,
  logEvent
}; 