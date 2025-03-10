/**
 * PerchPics Application Configuration
 * 
 * This file centralizes all configuration settings for the application.
 * It provides a single source of truth for configuration values.
 */

// Environment-specific configuration
const env = {
  development: {
    api: {
      pdsUrl: 'http://localhost:3001',
      timeout: 30000,
    },
  },
  production: {
    api: {
      pdsUrl: process.env.PDS_URL || 'http://localhost:3001',
      timeout: 30000,
    },
  },
};

// Determine current environment
const currentEnv = process.env.NODE_ENV === 'production' ? 'production' : 'development';

// Application configuration
export const config = {
  // API configuration
  api: {
    pdsUrl: env[currentEnv].api.pdsUrl,
    timeout: env[currentEnv].api.timeout,
  },
  
  // Authentication configuration
  auth: {
    tokenStorageKey: 'perchpics_token',
    userStorageKey: 'perchpics_user',
  },
  
  // Upload configuration
  upload: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  
  // Feature flags
  features: {
    optimisticUpdates: true,
    firehoseEnabled: true,
  },
};

export default config; 