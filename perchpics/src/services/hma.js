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
import { EventEmitter } from 'events';

// Increase max listeners for FormData to prevent memory leak warning
EventEmitter.defaultMaxListeners = 20;

// Get configuration from the central config
const config = {
  hma: {
    // Use the atproto-hma bridge instead of direct HMA service
    // IMPORTANT: Hardcoding bridge URL to ensure correct connection
    apiUrl: 'http://localhost:3001', // Hardcoded to avoid environment variable issues
    apiKey: process.env.HMA_API_KEY || pdsConfig.hma.apiKey,
    matchThreshold: parseFloat(process.env.HMA_MATCH_THRESHOLD || pdsConfig.hma.matchThreshold),
    webhookUrl: process.env.HMA_WEBHOOK_URL || pdsConfig.hma.webhookUrl,
    retryAttempts: parseInt(process.env.HMA_RETRY_ATTEMPTS || '3'),
    retryDelay: parseInt(process.env.HMA_RETRY_DELAY || '1000'), // ms
    timeout: parseInt(process.env.HMA_TIMEOUT || '5000') // ms
  },
  logging: {
    directory: process.env.HMA_LOG_DIR || pdsConfig.hma.logDirectory,
    enabled: true
  }
};

// Log configuration details
console.log(`HMA service configured with API URL: ${config.hma.apiUrl}`);
console.log(`Environment HMA_API_URL: ${process.env.HMA_API_URL} (ignored, using hardcoded bridge URL)`);

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
 * @param {string} imagePath - Path to the image file
 * @returns {Promise<Object>} - Hash data returned by HMA
 */
async function hashImage(imagePath) {
  let fileStream = null;
  
  try {
    logEvent('hash_image_request', { imagePath });
    
    // Create form data with image
    const formData = new FormData();
    const fileStats = fs.statSync(imagePath);
    fileStream = fs.createReadStream(imagePath);
    
    // Get file extension and MIME type
    const fileExt = path.extname(imagePath).slice(1).toLowerCase();
    const mimeType = getImageMimeType(fileExt);
    
    formData.append('image', fileStream, {
      filename: path.basename(imagePath),
      contentType: mimeType,
      knownLength: fileStats.size
    });
    
    // IMPORTANT: Hardcode the bridge URL to ensure it's always correct
    const BRIDGE_URL = 'http://localhost:3001';
    const hashUrl = `${BRIDGE_URL}/api/v1/hash`;
    
    // Call the HMA hash endpoint via the bridge
    const result = await retryFetch(async () => {
      console.log(`Sending hash request to ${hashUrl}`);
      
      const response = await fetch(hashUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.hma.apiKey}`
        },
        body: formData,
        timeout: config.hma.timeout // Add timeout to prevent hanging requests
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HMA hash request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      return response.json();
    });
    
    logEvent('hash_image_response', { result });
    return result;
  } catch (error) {
    logEvent('hash_image_error', { error: error.message });
    console.error('Error hashing image:', error);
    throw error;
  } finally {
    // Clean up resources to prevent memory leaks
    if (fileStream) {
      fileStream.destroy();
    }
  }
}

/**
 * Match a hash against the HMA database
 * @param {Object} hashData - The hash data to match
 * @returns {Promise<Object>} - Match result from HMA
 */
async function matchHash(hashData) {
  try {
    logEvent('match_hash_request', { hashData });
    
    // IMPORTANT: Hardcode the bridge URL to ensure it's always correct
    const BRIDGE_URL = 'http://localhost:3001';
    const matchUrl = `${BRIDGE_URL}/api/v1/match`;
    
    // Call the HMA match endpoint via the bridge
    const result = await retryFetch(async () => {
      console.log(`Sending match request to ${matchUrl}`);
      
      const response = await fetch(matchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.hma.apiKey}`
        },
        body: JSON.stringify(hashData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HMA match request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      return response.json();
    });
    
    logEvent('match_hash_response', { result });
    return result;
  } catch (error) {
    logEvent('match_hash_error', { error: error.message });
    console.error('Error matching hash:', error);
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
 *
 * IMPORTANT: This function should ONLY connect to the ATProto-HMA bridge service,
 * not directly to HMA 2.0. HMA 2.0 uses a different API structure (/h/hash, /m/compare)
 * that is incompatible with our application. The bridge translates between the
 * conventional REST API format our app expects (/api/v1/hash) and HMA's format.
 */
async function checkHealth() {
  // Only use the bridge service - NEVER try to connect directly to HMA service
  console.log('Performing HMA health check...');
  
  // Only check the bridge service, not direct HMA service
  const url = `${config.hma.apiUrl}/health`;
  console.log(`Trying HMA bridge health check at ${url}`);
  
  try {
    // Setup timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Timeout of ${config.hma.timeout}ms exceeded`)), config.hma.timeout);
    });
    
    // Make the request with timeout
    const response = await Promise.race([
      fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json, text/plain, */*',
        },
      }),
      timeoutPromise
    ]);
    
    if (response.ok) {
      let healthData;
      try {
        // Try to parse as JSON first
        healthData = await response.json();
      } catch (e) {
        // If JSON parsing fails, use a simple default
        healthData = { status: 'ok', note: 'Bridge service is available' };
      }
      
      console.log(`HMA bridge health check succeeded at ${url}`);
      return { success: true, endpoint: '/health', healthData };
    } else {
      throw new Error(`Health check failed with status: ${response.status}`);
    }
  } catch (error) {
    console.log(`HMA bridge health check error: ${error.message}`);
    
    // Try a fallback to root endpoint
    try {
      const rootUrl = config.hma.apiUrl;
      console.log(`Trying fallback HMA bridge health check at ${rootUrl}`);
      
      const response = await Promise.race([
        fetch(rootUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json, text/plain, */*',
          },
        }),
        timeoutPromise
      ]);
      
      if (response.ok) {
        console.log(`HMA bridge health check succeeded at ${rootUrl}`);
        return { 
          success: true, 
          endpoint: '/', 
          healthData: { status: 'ok', note: 'Using root endpoint as health check' } 
        };
      }
    } catch (fallbackError) {
      console.log(`HMA bridge fallback health check error: ${fallbackError.message}`);
    }
  }
  
  // If we've exhausted all options, return failure
  const error = new Error('Failed to connect to HMA bridge service');
  console.log(`HMA bridge health check failed: ${error.message}`);
  return { success: false, error };
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