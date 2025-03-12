/**
 * PerchPics PDS Configuration
 * 
 * This file re-exports the centralized configuration system for backward compatibility.
 * New code should import directly from '../config.js' instead.
 * @deprecated Use the centralized configuration system instead
 */

import { config, updateHmaWebhookUrl } from '../config.js';

// Re-export the central config as pdsConfig for backward compatibility
export const pdsConfig = {
  // Server configuration
  server: {
    host: config.server.host,
    port: config.server.port
  },
  
  // CORS configuration (re-exported for compatibility)
  cors: {
    origin: function(origin, callback) {
      // In development mode, allow all origins
      if (config.env.isDevelopment) {
        callback(null, true);
      } else {
        // In production, check against the allowed origins list
        if (!origin || config.server.corsOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  },
  
  // Database configuration - both new and old style for compatibility
  database: {
    location: config.database.location
  },
  // Old-style DB configuration for backward compatibility
  db: {
    location: config.database.location
  },
  
  // Storage configuration
  storage: {
    directory: config.storage.directory,
    maxSize: config.storage.maxSize,
    allowedTypes: config.storage.allowedTypes
  },
  
  // JWT configuration
  jwt: {
    secret: config.auth.jwtSecret,
    expiresIn: config.auth.jwtExpiresIn
  },
  
  // Auth configuration for backward compatibility
  auth: {
    secret: config.auth.jwtSecret,
    tokenExpiration: config.auth.jwtExpiresIn
  },
  
  // HMA configuration (re-exported for compatibility)
  hma: {
    apiUrl: config.hma.bridge.apiUrl,
    apiKey: config.hma.bridge.apiKey,
    matchThreshold: config.hma.processing.matchThreshold,
    webhookUrl: config.hma.webhook.url,
    logDirectory: config.hma.logging.directory
  },
  
  // Re-export the updateWebhookUrl function for backward compatibility
  updateWebhookUrl: updateHmaWebhookUrl
};

// Altitude integration configuration
export const altitudeConfig = {
  // The URL where the Altitude application is available
  url: process.env.ALTITUDE_URL || 'http://localhost:8080',
  
  // Webhook endpoint for Altitude to send verdicts back to
  webhookEndpoint: process.env.ALTITUDE_WEBHOOK_ENDPOINT || '/api/altitude/webhook',
  
  // API key for Altitude if required
  apiKey: process.env.ALTITUDE_API_KEY || '',
  
  // Enable/disable Altitude integration
  enabled: process.env.ALTITUDE_ENABLED === 'true' || false
};

export default pdsConfig; 