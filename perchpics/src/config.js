/**
 * ATProto-HMA Integration Configuration
 * 
 * This file centralizes all configuration settings for the ATProto-HMA integration.
 * It provides a single source of truth for configuration values that can be used
 * by any AT Protocol application that wants to implement HMA content moderation.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env file
dotenv.config();

// Helper functions
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Helper to get an environment variable with fallback
 * @param {string} key - The environment variable key
 * @param {string} fallback - The fallback value if not found
 * @returns {string} The environment variable value or fallback
 */
const getEnv = (key, fallback) => 
  process.env[key] !== undefined ? process.env[key] : fallback;

/**
 * Helper to get an environment variable as an integer
 * @param {string} key - The environment variable key
 * @param {number} fallback - The fallback value if not found
 * @returns {number} The environment variable value as an integer
 */
const getEnvInt = (key, fallback) => 
  parseInt(getEnv(key, fallback.toString()), 10);

/**
 * Helper to get an environment variable as a float
 * @param {string} key - The environment variable key
 * @param {number} fallback - The fallback value if not found
 * @returns {number} The environment variable value as a float
 */
const getEnvFloat = (key, fallback) => 
  parseFloat(getEnv(key, fallback.toString()));

/**
 * Helper to get an environment variable as a boolean
 * @param {string} key - The environment variable key
 * @param {boolean} fallback - The fallback value if not found
 * @returns {boolean} The environment variable value as a boolean
 */
const getEnvBool = (key, fallback) => 
  getEnv(key, fallback.toString()).toLowerCase() === 'true';

/**
 * Helper to get an environment variable as an array
 * @param {string} key - The environment variable key
 * @param {string} fallback - The fallback value if not found
 * @param {string} separator - The separator to split the string
 * @returns {string[]} The environment variable value as an array
 */
const getEnvArray = (key, fallback, separator = ',') => 
  getEnv(key, fallback).split(separator);

// Determine current environment
const NODE_ENV = getEnv('NODE_ENV', 'development');
const isDevelopment = NODE_ENV === 'development';
const isProduction = NODE_ENV === 'production';

// Create configuration object
export const config = {
  // Environment
  env: {
    current: NODE_ENV,
    isDevelopment,
    isProduction
  },
  
  // Server configuration (for hosting the PDS or any AT Protocol service)
  server: {
    host: getEnv('HOST', '0.0.0.0'),
    port: getEnvInt('PDS_PORT', 3002),
    frontendPort: getEnvInt('FRONTEND_PORT', 3000),
    corsOrigins: getEnvArray('CORS_ORIGINS', 'http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003,http://localhost:5000')
  },
  
  // Database configuration
  database: {
    location: getEnv('DB_LOCATION', './data/perchpics.db')
  },
  
  // Storage configuration
  storage: {
    directory: getEnv('STORAGE_DIRECTORY', './data/blobs'),
    maxSize: getEnvInt('STORAGE_MAX_SIZE', 5 * 1024 * 1024), // 5MB
    allowedTypes: getEnvArray('STORAGE_ALLOWED_TYPES', 'image/jpeg,image/png,image/webp')
  },
  
  // Authentication configuration
  auth: {
    jwtSecret: getEnv('JWT_SECRET', 'perchpics-development-secret'),
    jwtExpiresIn: getEnv('JWT_EXPIRES_IN', '7d'),
    tokenStorageKey: 'perchpics_token',
    userStorageKey: 'perchpics_user'
  },
  
  // HMA configuration
  hma: {
    // Bridge service configuration (the ATProto-HMA bridge)
    bridge: {
      // Primary URL for the ATProto-HMA bridge service (should be on port 3001)
      // Prefer environment variable HMA_BRIDGE_API_URL or fallback to legacy HMA_API_URL
      apiUrl: getEnv('HMA_BRIDGE_API_URL', 
                  getEnv('HMA_API_URL', 'http://localhost:3001')),
      apiKey: getEnv('HMA_API_KEY', 'dev_key')
    },
    
    // Direct HMA service configuration (the actual HMA service)
    service: {
      // URL for direct access to the HMA service (normally on port 5000)
      // This service is accessed by the bridge, not directly by the application
      apiUrl: getEnv('HMA_SERVICE_API_URL',
                  getEnv('HMA_SERVICE_URL', 'http://localhost:5000'))
    },
    
    // HMA processing configuration
    processing: {
      matchThreshold: getEnvFloat('HMA_MATCH_THRESHOLD', 0.8),
      retryAttempts: getEnvInt('HMA_RETRY_ATTEMPTS', 3),
      retryDelay: getEnvInt('HMA_RETRY_DELAY', 1000),
      timeout: getEnvInt('HMA_TIMEOUT', 5000)
    },
    
    // Webhook configuration
    webhook: {
      url: getEnv('HMA_WEBHOOK_URL', null),
      path: '/webhooks/hma'
    },
    
    // Logging configuration
    logging: {
      directory: getEnv('HMA_LOG_DIR', './logs/hma'),
      enabled: getEnvBool('HMA_LOGGING_ENABLED', true),
      verbosity: getEnvInt('HMA_LOG_VERBOSITY', 2) // 0=errors only, 1=basic, 2=detailed, 3=debug
    }
  },
  
  // Feature flags
  features: {
    optimisticUpdates: getEnvBool('FEATURE_OPTIMISTIC_UPDATES', true),
    firehoseEnabled: getEnvBool('FEATURE_FIREHOSE', true),
    memoryMonitoring: getEnvBool('FEATURE_MEMORY_MONITORING', true)
  },
  
  // Memory monitoring
  memoryMonitoring: {
    interval: getEnvInt('MEMORY_CHECK_INTERVAL_MS', 60000), // 1 minute
    warningThreshold: getEnvInt('MEMORY_WARNING_THRESHOLD_MB', 1024) // 1 GB
  }
};

/**
 * Update the HMA webhook URL with the actual server host and port
 * This is needed when the server is dynamically assigned a port
 * @param {number} actualPort - The actual port the server is running on
 */
export function updateHmaWebhookUrl(actualPort) {
  if (actualPort && actualPort !== config.server.port) {
    const host = config.server.host === '0.0.0.0' ? 'localhost' : config.server.host;
    config.hma.webhook.url = `http://${host}:${actualPort}${config.hma.webhook.path}`;
  } else if (!config.hma.webhook.url) {
    const host = config.server.host === '0.0.0.0' ? 'localhost' : config.server.host;
    config.hma.webhook.url = `http://${host}:${config.server.port}${config.hma.webhook.path}`;
  }
  return config.hma.webhook.url;
}

// Export helper functions for use in other modules
export { getEnv, getEnvInt, getEnvFloat, getEnvBool };

export default config; 