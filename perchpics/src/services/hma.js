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
import { pdsConfig } from '../pds/config.js';

// Get configuration from the central config
const config = {
  hma: {
    apiUrl: process.env.HMA_API_URL || pdsConfig.hma.apiUrl,
    apiKey: process.env.HMA_API_KEY || pdsConfig.hma.apiKey,
    matchThreshold: parseFloat(process.env.HMA_MATCH_THRESHOLD || pdsConfig.hma.matchThreshold),
    webhookUrl: process.env.HMA_WEBHOOK_URL || pdsConfig.hma.webhookUrl,
    retryAttempts: parseInt(process.env.HMA_RETRY_ATTEMPTS || '3'),
    retryDelay: parseInt(process.env.HMA_RETRY_DELAY || '1000') // ms
  },
  logging: {
    directory: process.env.HMA_LOG_DIR || pdsConfig.hma.logDirectory,
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
 * Helper function for retrying API calls
 */
async function retryFetch(apiCall, maxRetries = config.hma.retryAttempts, delay = config.hma.retryDelay) {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error;
      
      // Log the retry attempt
      logEvent('api_retry', { 
        attempt: attempt + 1, 
        maxRetries, 
        error: error.message 
      });
      
      // Wait before retrying (if not the last attempt)
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // If we get here, all retries failed
  throw lastError;
}

/**
 * Hash an image using the HMA service
 */
async function hashImage(imagePath) {
  try {
    // Read the image file as a buffer
    const imageBuffer = fs.readFileSync(imagePath);
    
    // Get the image MIME type
    const mimetype = getImageMimeType(path.extname(imagePath));
    
    // Create form data with the image
    const formData = new FormData();
    formData.append('image', imageBuffer, {
      filename: path.basename(imagePath),
      contentType: mimetype
    });
    
    // Call the HMA hash endpoint with retry logic
    const response = await retryFetch(async () => {
      const res = await fetch(`${config.hma.apiUrl}/api/v1/hash`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.hma.apiKey}`
        },
        body: formData
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`HMA hash request failed: ${res.status} ${res.statusText} - ${errorText}`);
      }
      
      return res;
    });
    
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
    // Call the HMA match endpoint with retry logic
    const response = await retryFetch(async () => {
      const res = await fetch(`${config.hma.apiUrl}/api/v1/match`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.hma.apiKey}`
        },
        body: JSON.stringify({
          hashes: Array.isArray(hashData) ? hashData : [hashData]
        })
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`HMA match request failed: ${res.status} ${res.statusText} - ${errorText}`);
      }
      
      return res;
    });
    
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
 * Helper function to determine the MIME type based on file extension
 */
function getImageMimeType(extension) {
  const ext = extension.toLowerCase();
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    default:
      return 'application/octet-stream';
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
      matches: significantMatches,
      hash: hashResult
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

/**
 * Check if the HMA API is available and responding
 */
async function checkHealth() {
  try {
    // Call the HMA health endpoint
    const response = await fetch(`${config.hma.apiUrl}/api/v1/health`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.hma.apiKey}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`HMA health check failed: ${response.status} ${response.statusText}`);
    }
    
    const healthData = await response.json();
    logEvent('health_check_success', { healthData });
    
    return {
      status: 'ok',
      details: healthData
    };
  } catch (error) {
    console.error('HMA health check error:', error);
    logEvent('health_check_error', { error: error.message });
    
    return {
      status: 'error',
      error: error.message
    };
  }
}

/**
 * Process a batch of images through the HMA pipeline
 * 
 * @param {Array} images - Array of objects containing {imagePath, imageInfo}
 * @param {Object} options - Processing options
 * @returns {Array} Results for each image
 */
async function processBatch(images, options = {}) {
  const results = [];
  const concurrencyLimit = options.concurrency || 3;
  
  // Process in batches to control concurrency
  for (let i = 0; i < images.length; i += concurrencyLimit) {
    const batch = images.slice(i, i + concurrencyLimit);
    
    // Process this batch in parallel
    const batchResults = await Promise.allSettled(
      batch.map(item => processImage(item.imagePath, item.imageInfo))
    );
    
    // Add results to the main results array
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push({
          success: true,
          imageInfo: batch[index].imageInfo,
          result: result.value
        });
      } else {
        results.push({
          success: false,
          imageInfo: batch[index].imageInfo,
          error: result.reason?.message || 'Unknown error'
        });
      }
    });
    
    // Log progress
    const progress = Math.min(i + concurrencyLimit, images.length);
    logEvent('batch_progress', { 
      processed: progress,
      total: images.length,
      remainingItems: images.length - progress
    });
    
    // If we're not at the end, add a small delay to avoid overwhelming the HMA service
    if (i + concurrencyLimit < images.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  // Log overall results
  const successCount = results.filter(r => r.success).length;
  const matchCount = results.filter(r => r.success && r.result.matched).length;
  
  logEvent('batch_complete', {
    totalImages: images.length,
    successCount,
    errorCount: images.length - successCount,
    matchCount
  });
  
  return results;
}

export default {
  processImage,
  hashImage,
  matchHash,
  sendWebhookNotification,
  logEvent,
  checkHealth,
  processBatch
}; 