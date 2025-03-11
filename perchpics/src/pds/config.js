/**
 * PerchPics PDS Configuration
 * 
 * This file contains configuration settings for the PerchPics PDS.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Configuration management for the PDS server
 */
class PDSConfig {
  constructor() {
    this.loadConfig();
  }

  /**
   * Load configuration from environment variables with fallbacks
   */
  loadConfig() {
    // Server settings
    this.server = {
      host: process.env.HOST || 'localhost',
      port: parseInt(process.env.PDS_PORT || process.env.PORT || '3002', 10)
    };
    
    // CORS settings
    this.cors = {
      origin: function(origin, callback) {
        // In development mode, allow all origins
        if (process.env.NODE_ENV !== 'production') {
          callback(null, true);
        } else {
          // In production, check against the allowed origins list
          const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000').split(',');
          if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
          } else {
            callback(new Error('Not allowed by CORS'));
          }
        }
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
      exposedHeaders: ['Content-Length', 'Content-Type'],
      credentials: true
    };
    
    // Database settings
    this.db = {
      location: process.env.DB_LOCATION || path.join(__dirname, '../../data/perchpics.db')
    };
    
    // Storage settings
    this.storage = {
      directory: process.env.STORAGE_DIRECTORY || path.join(__dirname, '../../data/blobs'),
      maxSize: parseInt(process.env.STORAGE_MAX_SIZE || '5242880', 10),
      allowedTypes: (process.env.STORAGE_ALLOWED_TYPES || 'image/jpeg,image/png,image/webp').split(',')
    };
    
    // Authentication settings
    this.auth = {
      secret: process.env.JWT_SECRET || 'perchpics-secret-key-change-in-production',
      tokenExpiration: process.env.JWT_EXPIRES_IN || '7d'
    };
    
    // HMA settings
    this.hma = {
      apiUrl: 'http://localhost:3001',
      apiKey: process.env.HMA_API_KEY || 'your-hma-api-key',
      matchThreshold: parseFloat(process.env.HMA_MATCH_THRESHOLD || '0.8'),
      logDirectory: process.env.HMA_LOG_DIR || './logs/hma',
      webhookUrl: process.env.HMA_WEBHOOK_URL || 'http://localhost:3001/webhooks/hma'
    };
  }

  /**
   * Update the webhook URL based on the actual running port
   * @param {number} actualPort - The port the server is actually running on
   */
  updateWebhookUrl(actualPort) {
    const host = process.env.HOST || 'localhost';
    this.hma.webhookUrl = `http://${host}:${actualPort}/webhooks/hma`;
    return this.hma.webhookUrl;
  }
}

// Create and export a singleton instance
export const pdsConfig = new PDSConfig(); 