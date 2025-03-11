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
 * Utility function for colorful console logging with configurable verbosity
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
  const colors = {
    reset: '\x1b[0m',
    success: '\x1b[32m', // green
    info: '\x1b[36m',    // cyan
    warn: '\x1b[33m',    // yellow
    error: '\x1b[31m',   // red
    debug: '\x1b[90m'    // gray
  };
  
  // Prefix emojis for logs
  const emojis = {
    success: '✅',
    info: 'ℹ️',
    warn: '⚠️',
    error: '❌',
    debug: '🔍'
  };
  
  // Format the message
  const prefix = `${emojis[level]} HMA ${level.toUpperCase()}:`;
  console.log(`${colors[level]}${prefix}${colors.reset} ${message}`);
  
  // Log details if present and verbosity is high enough
  if (details && minVerbosity <= config.hma.logging.verbosity) {
    if (typeof details === 'string') {
      console.log(`   ${details}`);
    } else {
      console.log(`   ${JSON.stringify(details, null, 2)}`);
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
   * Process an image through the HMA service
   * @param {string} imagePath - Path to the image file
   * @param {object} metadata - Metadata about the image
   * @param {number} [attempt=1] - Current attempt number (for retries)
   * @returns {Promise<object>} The processing result
   */
  async processImage(imagePath, metadata, attempt = 1) {
    const { author_did, photo_id } = metadata;
    
    this.logger('debug', `Processing image ${photo_id} (attempt ${attempt}/${this.retryAttempts})`, null, 3);
    
    try {
      if (!fs.existsSync(imagePath)) {
        throw new HmaError(`Image file not found: ${imagePath}`, 'FILE_NOT_FOUND');
      }
      
      // Create form data with the image
      const form = new FormData();
      form.append('image', fs.createReadStream(imagePath));
      form.append('threshold', this.matchThreshold.toString());
      
      // Add metadata
      if (author_did) form.append('author_did', author_did);
      if (photo_id) form.append('photo_id', photo_id);
      
      // Custom app headers
      const headers = {
        'X-API-Key': this.apiKey,
        ...form.getHeaders()
      };
      
      // Call the match endpoint on the bridge
      const matchEndpoint = `${this.apiUrl}/api/v1/match`;
      this.logger('debug', `Calling HMA match endpoint: ${matchEndpoint}`, null, 3);
      
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
      
      // Process the result
      if (matchResult.matched) {
        this.logger('info', `Image ${photo_id} matched in HMA database`, {
          matchCount: matchResult.matches ? matchResult.matches.length : 0
        }, 2);
      } else {
        this.logger('debug', `Image ${photo_id} did not match any entries in HMA database`, null, 3);
      }
      
      return {
        matched: matchResult.matched || false,
        matches: matchResult.matches || [],
        metadata: {
          author_did,
          photo_id,
          processedAt: new Date().toISOString()
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
          const result = await this.processImage(image.path, image.metadata);
          results.push({
            photo_id: image.metadata.photo_id,
            result
          });
          return result;
        } catch (error) {
          errors.push({
            photo_id: image.metadata.photo_id,
            error: error.message
          });
          return null;
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