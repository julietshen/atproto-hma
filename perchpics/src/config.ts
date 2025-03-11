/**
 * PerchPics Application Configuration
 * 
 * This file centralizes all configuration settings for the application.
 * It provides a single source of truth for configuration values.
 */

// Helper to get an environment variable with fallback
const getEnv = (key: string, fallback: string): string => 
  typeof process !== 'undefined' && process.env && process.env[key] ? process.env[key]! : fallback;

// Environment-specific configuration
const env = {
  development: {
    api: {
      pdsUrl: 'http://localhost:3000',
      hmaUrl: 'http://localhost:3001',
      timeout: 30000,
    },
  },
  production: {
    api: {
      pdsUrl: getEnv('PDS_URL', 'http://localhost:3000'),
      hmaUrl: getEnv('HMA_URL', 'http://localhost:3001'),
      timeout: parseInt(getEnv('API_TIMEOUT', '30000')),
    },
  },
};

// Determine current environment
const currentEnv = getEnv('NODE_ENV', 'development') === 'production' ? 'production' : 'development';

// Application configuration
export const config = {
  // API configuration
  api: {
    pdsUrl: env[currentEnv].api.pdsUrl,
    hmaUrl: env[currentEnv].api.hmaUrl,
    timeout: env[currentEnv].api.timeout,
  },
  
  // Authentication configuration
  auth: {
    tokenStorageKey: 'perchpics_token',
    userStorageKey: 'perchpics_user',
  },
  
  // Upload configuration
  upload: {
    maxFileSize: parseInt(getEnv('MAX_FILE_SIZE', (5 * 1024 * 1024).toString())), // 5MB default
    allowedTypes: getEnv('ALLOWED_FILE_TYPES', 'image/jpeg,image/png,image/webp').split(','),
  },
  
  // Feature flags
  features: {
    optimisticUpdates: getEnv('FEATURE_OPTIMISTIC_UPDATES', 'true') === 'true',
    firehoseEnabled: getEnv('FEATURE_FIREHOSE', 'true') === 'true',
  },
};

export default config; 