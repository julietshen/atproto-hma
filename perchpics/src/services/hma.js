/**
 * PerchPics HMA Service
 * 
 * This service provides integration with Meta's Hasher-Matcher-Actioner (HMA)
 * for content moderation of uploaded photos via the ATProto-HMA Bridge.
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import { EventEmitter } from 'events';
import { config } from '../config.js';

// Increase max listeners for FormData to prevent memory leak warning
EventEmitter.defaultMaxListeners = 20;

/**
 * Log a message with HMA-specific formatting
 * @param {string} level - The log level: 'success', 'info', 'warn', 'error', 'debug'
 * @param {string} message - The main message to log
 * @param {object} details - Optional details to include
 * @param {number} minVerbosity - Minimum verbosity level required to show this log
 */
function hmaLog(level, message, details = null, minVerbosity = 1) {
  // Skip logging if verbosity is too low
  if (minVerbosity > config.hma.logging.verbosity) {
    return;
  }
  
  const timestamp = new Date().toISOString();
  const useColors = process.env.HMA_COLORFUL_LOGGING === 'true';
  
  const colors = {
    reset: useColors ? '\x1b[0m' : '',
    success: useColors ? '\x1b[32m' : '', // green
    info: useColors ? '\x1b[36m' : '',    // cyan
    warn: useColors ? '\x1b[33m' : '',    // yellow
    error: useColors ? '\x1b[31m' : '',   // red
    debug: useColors ? '\x1b[90m' : '',   // gray
    nomatch: useColors ? '\x1b[34m' : '', // blue - for no match messages
    bright: useColors ? '\x1b[1m' : '',   // bright/bold
    dim: useColors ? '\x1b[2m' : '',      // dim
    underline: useColors ? '\x1b[4m' : '' // underline
  };
  
  // Prefix emojis for logs
  const emojis = {
    success: '✅',
    info: 'ℹ️',
    warn: '⚠️',
    error: '❌',
    debug: '🔍',
    nomatch: '❎'  // Add a specific emoji for no match
  };
  
  // Format the message
  const prefix = `${emojis[level]} ${colors[level]}HMA ${level.toUpperCase()}:${colors.reset}`;
  
  // Special formatting for match results to make them more visually distinct
  if (message.includes('SIGNIFICANT MATCH FOUND')) {
    // For significant match results, create a visually distinct format
    const formattedMessage = `${colors.bright}${colors.success}${message}${colors.reset}`;
    console.log(`${prefix} ${formattedMessage}`);
    
    // Always add a separator for significant matches
    console.log(`   ${colors.dim}----------------------------------------${colors.reset}`);
    
    // Format the details with proper coloring and indentation
    if (details) {
      if (details.action) {
        console.log(`   ${colors.bright}action:${colors.reset} ${colors.success}${details.action}${colors.reset}`);
      }
      if (details.significantMatches) {
        console.log(`   ${colors.bright}significantMatches:${colors.reset} ${details.significantMatches}`);
      }
      if (details.matchThreshold) {
        console.log(`   ${colors.bright}matchThreshold:${colors.reset} ${details.matchThreshold}`);
      }
      if (details.hash) {
        console.log(`   ${colors.bright}hash:${colors.reset} ${colors.dim}${details.hash}${colors.reset}`);
      }
    }
    
    // Add a closing separator
    console.log(`   ${colors.dim}----------------------------------------${colors.reset}`);
  } else if (message.includes('NO MATCH FOUND')) {
    // For no match results, create a visually distinct format with blue color
    const formattedMessage = `${colors.bright}${colors.nomatch}${message}${colors.reset}`;
    console.log(`${prefix} ${formattedMessage}`);
    
    // Add a separator
    console.log(`   ${colors.dim}----------------------------------------${colors.reset}`);
    
    // Format the details similar to significant match
    if (details) {
      if (details.matchCount !== undefined) {
        console.log(`   ${colors.bright}matchCount:${colors.reset} ${details.matchCount}`);
      }
      if (details.filename) {
        console.log(`   ${colors.bright}filename:${colors.reset} ${details.filename}`);
      }
      if (details.matchThreshold) {
        console.log(`   ${colors.bright}matchThreshold:${colors.reset} ${details.matchThreshold}`);
      }
      if (details.imageHash) {
        console.log(`   ${colors.bright}hash:${colors.reset} ${colors.dim}${details.imageHash}${colors.reset}`);
      }
    }
    
    // Add a closing separator
    console.log(`   ${colors.dim}----------------------------------------${colors.reset}`);
  } else if (message.includes('matches for image')) {
    // For match success, highlight key information
    const formattedMessage = message
      .replace(/Found (\d+) matches/g, `Found ${colors.bright}$1${colors.reset} matches`);
    
    console.log(`${prefix} ${formattedMessage}`);
    
    // Log details for match information
    if (details) {
      if (details.matchCount !== undefined) {
        console.log(`   ${colors.bright}matchCount:${colors.reset} ${details.matchCount}`);
      }
      if (details.filename) {
        console.log(`   ${colors.bright}filename:${colors.reset} ${details.filename}`);
      }
      if (details.firstMatch && typeof details.firstMatch === 'object') {
        const firstMatchStr = JSON.stringify(details.firstMatch, null, 2)
          .replace(/{|}|"|,/g, '');
        console.log(`   ${colors.bright}firstMatch:${colors.reset} ${colors.dim}${firstMatchStr}${colors.reset}`);
      }
    }
    
    // Add a separator after match details
    console.log(`   ${colors.dim}----------------------------------------${colors.reset}`);
  } else if (message.includes('did not match any entries')) {
    // Special case for non-matching images - use blue coloring
    const formattedMessage = `${colors.nomatch}${message}${colors.reset}`;
    console.log(`${prefix} ${formattedMessage}`);
    
    // Add detailed formatting similar to the match case
    if (details) {
      // Format the details with proper coloring and indentation
      if (details.matchCount !== undefined) {
        console.log(`   ${colors.bright}matchCount:${colors.reset} ${details.matchCount}`);
      }
      if (details.filename) {
        console.log(`   ${colors.bright}filename:${colors.reset} ${details.filename}`);
      }
      if (details.matchThreshold) {
        console.log(`   ${colors.bright}matchThreshold:${colors.reset} ${details.matchThreshold}`);
      }
      if (details.imageHash) {
        console.log(`   ${colors.bright}hash:${colors.reset} ${colors.dim}${details.imageHash}${colors.reset}`);
      }
    }
    
    // Add a separator after non-match message for visual distinction
    console.log(`   ${colors.dim}----------------------------------------${colors.reset}`);
  } else {
    // Regular message
    console.log(`${prefix} ${message}`);
    
    // Log details if present
    if (details && typeof details === 'object') {
      // If it's a simple object with status info
      if (details.url && details.status) {
        console.log(`   ${colors.dim}url:${colors.reset} ${details.url}`);
        console.log(`   ${colors.dim}status:${colors.reset} ${details.status}`);
        if (details.endpoint) {
          console.log(`   ${colors.dim}endpoint:${colors.reset} ${details.endpoint}`);
        }
        
        // Add a separator after health check details
        console.log(`   ${colors.dim}----------------------------------------${colors.reset}`);
      } 
      // Any other detailed objects
      else if (Object.keys(details).length > 0 && minVerbosity <= config.hma.logging.verbosity) {
        for (const [key, value] of Object.entries(details)) {
          if (value !== undefined && value !== null) {
            console.log(`   ${colors.dim}${key}:${colors.reset} ${value}`);
          }
        }
      }
    } else if (details && typeof details === 'string' && minVerbosity <= config.hma.logging.verbosity) {
      console.log(`   ${details}`);
    }
  }
  
  // For log files, write to disk if enabled
  if (config.hma.logging.enabled && config.hma.logging.directory) {
    try {
      const logDir = config.hma.logging.directory;
      const logFile = path.join(logDir, `hma-${new Date().toISOString().split('T')[0]}.log`);
      
      // Ensure log directory exists
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      
      // Format log entry
      let logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
      if (details) {
        if (typeof details === 'string') {
          logEntry += `   ${details}\n`;
        } else {
          logEntry += `   ${JSON.stringify(details, null, 2)}\n`;
        }
      }
      
      // Append to log file
      fs.appendFileSync(logFile, logEntry);
    } catch (err) {
      // Don't crash if logging fails
      console.error('Failed to write to HMA log file:', err.message);
    }
  }
}

/**
 * Standard error class for HMA operations
 */
class HmaError extends Error {
  constructor(message, code = 'UNKNOWN_ERROR', details = null) {
    super(message);
    this.name = 'HmaError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Configuration manager for HMA client
 * Manages the configuration hierarchy: env vars > config object > defaults
 */
class HmaConfigManager {
  static BRIDGE_API_URL_DEFAULT = 'http://localhost:3001';
  static SERVICE_API_URL_DEFAULT = 'http://localhost:5000';
  
  constructor(options = {}) {
    this.configObj = options.config || config.hma || {};
    this.envVars = options.env || process.env;
    this.logger = options.logger || hmaLog;
  }
  
  /**
   * Get the bridge API URL with the following precedence:
   * 1. Environment variable HMA_BRIDGE_API_URL (preferred, specific to bridge)
   * 2. Environment variable HMA_API_URL (legacy, might point to service)
   * 3. Configuration value from config.js
   * 4. Default value (localhost:3001)
   */
  getBridgeApiUrl() {
    // 1. Check for bridge-specific env var
    const bridgeEnvUrl = this.envVars.HMA_BRIDGE_API_URL;
    if (bridgeEnvUrl) {
      this.logger('debug', `Using bridge URL from HMA_BRIDGE_API_URL: ${bridgeEnvUrl}`, null, 2);
      return bridgeEnvUrl;
    }
    
    // 2. Get from legacy env var (might not be reliable)
    const legacyEnvUrl = this.envVars.HMA_API_URL;
    if (legacyEnvUrl) {
      // Check if it has port 3001 (bridge) or 5000 (direct service)
      if (legacyEnvUrl.includes(':3001')) {
        this.logger('debug', `Using bridge URL from HMA_API_URL: ${legacyEnvUrl}`, null, 2);
        return legacyEnvUrl;
      } else {
        this.logger('warn', `HMA_API_URL (${legacyEnvUrl}) points to service port, not bridge port`, null, 2);
      }
    }
    
    // 3. Get from config object
    const configUrl = this.configObj.bridge?.apiUrl;
    if (configUrl) {
      if (configUrl.includes(':3001')) {
        this.logger('debug', `Using bridge URL from config: ${configUrl}`, null, 2);
        return configUrl;
      } else {
        this.logger('warn', `Config bridge.apiUrl (${configUrl}) doesn't appear to point to bridge port`, null, 2);
      }
    }
    
    // 4. Use default as fallback
    this.logger('debug', `Using default bridge URL: ${HmaConfigManager.BRIDGE_API_URL_DEFAULT}`, null, 2);
    return HmaConfigManager.BRIDGE_API_URL_DEFAULT;
  }
  
  /**
   * Get the service API URL with the following precedence:
   * 1. Environment variable HMA_SERVICE_API_URL (preferred, specific to service)
   * 2. Configuration value from config.js
   * 3. Default value (localhost:5000)
   */
  getServiceApiUrl() {
    const serviceEnvUrl = this.envVars.HMA_SERVICE_API_URL;
    if (serviceEnvUrl) {
      return serviceEnvUrl;
    }
    
    const configUrl = this.configObj.service?.apiUrl;
    if (configUrl) {
      return configUrl;
    }
    
    return HmaConfigManager.SERVICE_API_URL_DEFAULT;
  }
  
  /**
   * Get configuration value with fallbacks
   */
  getValue(key, defaultValue) {
    // Start with defaults
    let result = defaultValue;
    
    // Check config
    const keyParts = key.split('.');
    let configValue = this.configObj;
    let found = true;
    
    for (const part of keyParts) {
      if (configValue && typeof configValue === 'object' && part in configValue) {
        configValue = configValue[part];
      } else {
        found = false;
        break;
      }
    }
    
    if (found) {
      result = configValue;
    }
    
    // Check env var (uppercase with underscores)
    const envKey = `HMA_${key.toUpperCase().replace(/\./g, '_')}`;
    if (envKey in this.envVars) {
      const envValue = this.envVars[envKey];
      
      // Convert string to appropriate type
      if (typeof defaultValue === 'number') {
        result = Number(envValue);
      } else if (typeof defaultValue === 'boolean') {
        result = envValue.toLowerCase() === 'true';
      } else {
        result = envValue;
      }
    }
    
    return result;
  }
  
  /**
   * Log all configuration settings
   */
  logConfiguration() {
    console.log('-'.repeat(20) + ' HMA CONFIGURATION ' + '-'.repeat(20));
    
    // Log URLs
    const bridgeUrl = this.getBridgeApiUrl();
    const serviceUrl = this.getServiceApiUrl();
    
    console.log(`Bridge URL: ${bridgeUrl} (this is the primary API endpoint used)`);
    console.log(`Service URL: ${serviceUrl} (direct HMA service, used by bridge)`);
    
    // Log environment variables
    console.log('Environment Variables:');
    console.log(`  HMA_API_URL: ${this.envVars.HMA_API_URL || '(not set)'}`);
    console.log(`  HMA_BRIDGE_API_URL: ${this.envVars.HMA_BRIDGE_API_URL || '(not set)'}`);
    console.log(`  HMA_SERVICE_API_URL: ${this.envVars.HMA_SERVICE_API_URL || '(not set)'}`);
    
    // Log other config values
    console.log('Other Settings:');
    console.log(`  Retry Attempts: ${this.getValue('processing.retryAttempts', 3)}`);
    console.log(`  Retry Delay: ${this.getValue('processing.retryDelay', 1000)}ms`);
    console.log(`  Timeout: ${this.getValue('processing.timeout', 10000)}ms`);
    console.log(`  Match Threshold: ${this.getValue('processing.matchThreshold', 0.9)}`);
    console.log(`  Log Verbosity: ${this.getValue('logging.verbosity', 1)}`);
    
    console.log('-'.repeat(60));
  }
}

/**
 * HMA API client for interacting with the ATProto-HMA Bridge
 */
class HmaClient {
  /**
   * Create a new HMA client
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    // Allow dependency injection for easier testing and flexibility
    this.config = options.configManager || new HmaConfigManager({ 
      config: options.config || config.hma,
      env: options.env || process.env,
      logger: options.logger || hmaLog
    });
    
    this.logger = options.logger || hmaLog;
    this.fetch = options.fetch || fetch;
    
    // Log configuration
    this.config.logConfiguration();
    
    // Set up client configuration
    this.apiUrl = this.config.getBridgeApiUrl();
    this.serviceUrl = this.config.getServiceApiUrl();
    this.apiKey = this.config.getValue('bridge.apiKey', '');
    this.retryAttempts = this.config.getValue('processing.retryAttempts', 3);
    this.retryDelay = this.config.getValue('processing.retryDelay', 1000);
    this.timeout = this.config.getValue('processing.timeout', 10000);
    this.matchThreshold = this.config.getValue('processing.matchThreshold', 0.9);
    
    this.logger('info', `HMA service configured with API URL: ${this.apiUrl}`);
  }
  
  /**
   * Check if the HMA service is healthy
   * @returns {Promise<object>} The health check result
   */
  async checkHealth() {
    this.logger('info', 'Performing HMA health check...', null, 1);
    
    try {
      // Try the bridge health endpoint
      const healthUrl = `${this.apiUrl}/health`;
      this.logger('debug', `Trying HMA bridge health check at ${healthUrl}`, null, 3);
      
      const response = await this.fetch(healthUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: this.timeout
      });
      
      if (response.ok) {
        const data = await response.json();
        this.logger('success', 'HMA bridge health check succeeded', {
          url: healthUrl,
          status: data.status || 'ok',
          endpoint: '/health'
        }, 2);
        
        return {
          healthy: true,
          status: data.status || 'ok',
          message: 'HMA bridge service is healthy'
        };
      } else {
        const errorText = await response.text();
        throw new HmaError(
          `HMA bridge responded with status ${response.status}`,
          'BRIDGE_STATUS_ERROR',
          { status: response.status, response: errorText }
        );
      }
    } catch (error) {
      if (error instanceof HmaError) {
        throw error;
      }
      
      this.logger('error', 'HMA bridge health check failed', {
        error: error.message
      }, 1);
      
      return {
        healthy: false,
        status: 'error',
        message: `HMA bridge health check failed: ${error.message}`
      };
    }
  }
  
  /**
   * Process a single image through HMA matching
   * @param {string} imagePath - Path to the image file
   * @param {object} metadata - Metadata about the image
   * @param {number} [attempt=1] - Current attempt number (for retries)
   * @returns {Promise<object>} The processing result
   */
  async processImage(imagePath, metadata, attempt = 1) {
    const userDid = metadata?.userDid;
    const photoId = metadata?.photoId;
    
    if (!userDid || !photoId) {
      this.logger('warn', `Missing metadata for image at ${imagePath}. Skipping processing.`, null, 3);
      return {
        matched: false,
        matches: [],
        action: 'none',
        metadata: {
          processedAt: new Date().toISOString(),
          error: 'Missing required metadata (userDid or photoId)'
        }
      };
    }
    
    this.logger('debug', `Processing image ${photoId} (attempt ${attempt}/${this.retryAttempts})`, {
      apiUrl: this.apiUrl,
      bridgeEndpoint: `${this.apiUrl}/api/v1/match`
    }, 3);
    
    this.logger('debug', `Using match threshold: ${this.matchThreshold}`, {
      matchThreshold: this.matchThreshold,
      thresholdType: typeof this.matchThreshold
    }, 2);
    
    try {
      if (!fs.existsSync(imagePath)) {
        throw new HmaError(`Image file not found: ${imagePath}`, 'FILE_NOT_FOUND');
      }
      
      // Create form data with the image
      const form = new FormData();
      form.append('image', fs.createReadStream(imagePath));
      
      // Set match threshold
      this.logger('debug', `Using match threshold: ${this.matchThreshold}`, null, 3);
      form.append('threshold', this.matchThreshold.toString());
      
      // Add metadata - use the bridge API expected parameter names
      if (userDid) {
        form.append('author_did', userDid);  // Send as author_did to bridge API
        this.logger('debug', `Added author_did: ${userDid}`, null, 3);
      }
      
      if (photoId) {
        form.append('photo_id', photoId);    // Send as photo_id to bridge API
        this.logger('debug', `Added photo_id: ${photoId}`, null, 3);
      }
      
      // Add additional metadata as a JSON string
      const metadataObj = {
        userDid,
        photoId,
        source: 'perchpics_upload',
        processedAt: new Date().toISOString()
      };
      form.append('metadata', JSON.stringify(metadataObj));
      this.logger('debug', `Added metadata JSON object`, metadataObj, 3);
      
      // Custom app headers
      const headers = {
        'X-API-Key': this.apiKey,
        ...form.getHeaders()
      };
      
      // Call the match endpoint on the bridge
      const matchEndpoint = `${this.apiUrl}/api/v1/match`;
      this.logger('debug', `Calling HMA match endpoint: ${matchEndpoint}`, null, 2);
      
      const response = await this.fetch(matchEndpoint, {
        method: 'POST',
        headers,
        body: form,
        timeout: this.timeout
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new HmaError(
          `HMA match API responded with status ${response.status}`,
          'MATCH_API_ERROR',
          { status: response.status, response: errorText }
        );
      }
      
      const matchResult = await response.json();
      
      // Add detailed logging of the raw match result
      this.logger('debug', `Raw match response:`, {
        matchResultKeys: Object.keys(matchResult),
        matchStatus: matchResult.status || 'no status',
        matchSuccess: matchResult.success || false,
        matchedFlag: matchResult.matched || false,
        matchCount: matchResult.matches ? matchResult.matches.length : 0,
        hash: matchResult.hash || 'no hash returned'
      }, 3);
      
      // Check if there are any matches, even if matchedFlag is false
      if (matchResult.matches && matchResult.matches.length > 0) {
        // Force matched flag to true if we have any matches
        matchResult.matched = true;
        matchResult.action = 'REVIEW';
        
        const matchCount = matchResult.matches.length;
        
        // Log the match information with the format shown in the screenshot
        this.logger('success', `Found ${matchCount} matches for image ${path.basename(imagePath)}`, {
          matchCount,
          filename: path.basename(imagePath),
          firstMatch: matchResult.matches[0] || {}
        }, 2);
        
        // Format matches with the exact style from the screenshot
        this.logger('success', `SIGNIFICANT MATCH FOUND for image ${path.basename(imagePath)}`, {
          action: 'REVIEW',
          significantMatches: `${matchCount} out of ${matchCount} total`,
          matchThreshold: this.matchThreshold,
          hash: matchResult.matches[0]?.hash || ""
        }, 1);
      } else if (!matchResult.matched) {
        // Use success level for consistent formatting but with NO MATCH message
        this.logger('success', `NO MATCH FOUND for image ${path.basename(imagePath)}`, {
          matchCount: 0,
          filename: path.basename(imagePath),
          matchThreshold: this.matchThreshold,
          imageHash: matchResult.hash || 'no hash returned'
        }, 1);
      }
      
      // Ensure we return a properly structured result
      return {
        matched: matchResult.matched || false,
        matches: matchResult.matches || [],
        action: matchResult.action || 'none', 
        metadata: {
          userDid,
          photoId,
          processedAt: new Date().toISOString(),
          threshold: this.matchThreshold
        }
      };
    } catch (error) {
      // Handle retries
      if (attempt < this.retryAttempts) {
        this.logger('warn', `HMA processing failed (attempt ${attempt}/${this.retryAttempts}), retrying...`, {
          error: error.message
        }, 2);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        
        // Retry the request
        return this.processImage(imagePath, metadata, attempt + 1);
      }
      
      // Max retries reached, log and throw
      if (error instanceof HmaError) {
        this.logger('error', `HMA processing failed after ${attempt} attempts: ${error.message}`, {
          code: error.code,
          details: error.details
        }, 1);
        throw error;
      } else {
        this.logger('error', `HMA processing failed after ${attempt} attempts: ${error.message}`, null, 1);
        throw new HmaError(`HMA processing failed: ${error.message}`, 'PROCESSING_ERROR');
      }
    }
  }
  
  /**
   * Process a batch of images through the HMA service
   * @param {array} images - Array of image objects with path and metadata
   * @param {object} options - Processing options
   * @returns {Promise<object>} The batch processing results
   */
  async processBatch(images, options = {}) {
    const { concurrency = 3 } = options;
    const results = [];
    const errors = [];
    
    this.logger('info', `Processing batch of ${images.length} images (concurrency: ${concurrency})`, null, 2);
    
    // Process in batches based on concurrency
    for (let i = 0; i < images.length; i += concurrency) {
      const batch = images.slice(i, i + concurrency);
      const batchPromises = batch.map(async (image) => {
        try {
          // Ensure we have the correct properties
          if (!image.imagePath || !image.imageInfo) {
            throw new Error('Invalid image object: missing imagePath or imageInfo');
          }
          
          const result = await this.processImage(image.imagePath, image.imageInfo);
          results.push({
            photoId: image.imageInfo.photoId,
            result,
            success: true
          });
          return { success: true, result, imageInfo: image.imageInfo };
        } catch (error) {
          this.logger('error', `Error processing image in batch: ${error.message}`, { 
            photoId: image.imageInfo?.photoId || 'unknown',
            path: image.imagePath || 'unknown'
          }, 1);
          
          errors.push({
            photoId: image.imageInfo?.photoId || 'unknown',
            error: error.message,
            success: false
          });
          return { 
            success: false, 
            error: error.message, 
            imageInfo: image.imageInfo || {}
          };
        }
      });
      
      // Wait for batch to complete
      await Promise.all(batchPromises);
      
      // Progress update
      this.logger('debug', `Processed ${Math.min(i + concurrency, images.length)}/${images.length} images`, null, 2);
    }
    
    this.logger('info', `Batch processing complete. ${results.length} succeeded, ${errors.length} failed.`, null, 2);
    
    return {
      total: images.length,
      succeeded: results.length,
      failed: errors.length,
      results,
      errors
    };
  }
}

// Export the classes for easier testing and extension
export { HmaClient, HmaConfigManager, HmaError, hmaLog };

// Create and export a singleton instance with the default configuration
const hmaService = new HmaClient();
export default hmaService; 