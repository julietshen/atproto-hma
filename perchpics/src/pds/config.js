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
      port: parseInt(process.env.PORT || '3001', 10),
      portFallbacks: [3001, 3002, 3003, 3004, 3005]
    };
    
    // CORS settings
    this.cors = {
      origin: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3001,http://localhost:3002').split(','),
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
      apiUrl: process.env.HMA_API_URL || 'http://localhost:5000',
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
    // Generate default webhook URL with the actual port
    const configuredPort = this.server.port;
    const defaultUrl = `http://${this.server.host}:${actualPort}/webhooks/hma`;
    
    // If there's no explicit webhook URL or it contains the configured port, update it
    if (!process.env.HMA_WEBHOOK_URL || process.env.HMA_WEBHOOK_URL.includes(`:${configuredPort}/`)) {
      this.hma.webhookUrl = defaultUrl;
    } else {
      this.hma.webhookUrl = process.env.HMA_WEBHOOK_URL;
    }
    
    return this.hma.webhookUrl;
  }
}

// Create and export a singleton instance
export const pdsConfig = new PDSConfig(); 