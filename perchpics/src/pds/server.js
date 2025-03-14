/**
 * PerchPics PDS Server
 * 
 * This file implements a basic Personal Data Server (PDS) for PerchPics.
 * It handles user authentication, data storage, and serving content.
 */

import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import net from 'net';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import PDS modules
import { config, updateHmaWebhookUrl } from '../config.js';
import { createDatabase } from './database.js';
import { setupAuthRoutes } from './auth.js';
import { setupPhotoRoutes } from './photos.js';
import { setupWebhookRoutes } from './webhooks.js';
import { setupModerationRoutes } from './moderation.js';
import { setupApiRoutes } from './api.js';
import hmaService from '../services/hma.js';
import { startMemoryMonitor, logMemoryUsage } from '../utils/memory-monitor.js';

/**
 * Check if a port is available
 * @param {number} port - The port to check
 * @returns {Promise<boolean>} True if the port is available
 */
const isPortAvailable = async (port) => {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.once('error', () => {
      resolve(false);
    });
    
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    
    server.listen(port);
  });
};

/**
 * Ensure required directories exist
 */
const ensureDirectories = () => {
  // Create data directory if it doesn't exist
  const dataDir = path.join(__dirname, '../../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // Create blobs directory if it doesn't exist
  const blobsDir = config.storage.directory;
  if (!fs.existsSync(blobsDir)) {
    fs.mkdirSync(blobsDir, { recursive: true });
  }
  
  // Create logs directory if it doesn't exist
  if (config.hma.logging.enabled && config.hma.logging.directory) {
    if (!fs.existsSync(config.hma.logging.directory)) {
      fs.mkdirSync(config.hma.logging.directory, { recursive: true });
    }
  }
};

/**
 * Initialize the PDS server
 */
export const initPDSServer = async () => {
  try {
    // Start memory monitor if enabled
    if (config.features.memoryMonitoring) {
      const memoryMonitor = startMemoryMonitor(
        config.memoryMonitoring.interval, 
        config.memoryMonitoring.warningThreshold
      );
      console.log('Memory monitoring enabled');
    }
    
    // Ensure required directories exist
    ensureDirectories();
    
    // Use the configured port from the central config
    const port = config.server.port;
    const host = config.server.host;
    
    // Check if port is available in development mode
    if (config.env.isDevelopment) {
      const isAvailable = await isPortAvailable(port);
      if (!isAvailable) {
        console.error(`Port ${port} is already in use. Please configure a different port in your .env file.`);
        throw new Error(`Port ${port} is already in use`);
      }
    }
    
    // Update webhook URL based on actual port
    const webhookUrl = updateHmaWebhookUrl(port);
    
    // Check HMA service health
    try {
      let healthResult = await hmaService.checkHealth();
      
      if (healthResult.healthy) {
        console.log(`HMA service health check result: ok`);
      } else {
        console.warn(`Warning: Unable to connect to HMA service. Image hashing may not work.`);
        console.warn(`HMA Error: ${healthResult.message}`);
      }
    } catch (error) {
      console.warn(`Warning: Unable to connect to HMA service. Image hashing may not work.`);
      console.error(`HMA Error: ${error.message}`);
    }
    
    // Initialize database
    const db = await createDatabase();
    
    // Create Express app
    const app = express();
    
    // Configure middleware
    app.use(cors({
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
    }));
    app.use(bodyParser.json({ limit: '50mb' }));
    
    // Set up routes
    setupAuthRoutes(app, db);
    setupPhotoRoutes(app, db);
    setupWebhookRoutes(app, db);
    setupModerationRoutes(app, db);
    setupApiRoutes(app, db);
    
    // AT Protocol standard health endpoint
    app.get('/xrpc/_health', (req, res) => {
      res.json({ status: 'ok', version: '1.0.0' });
    });
    
    // Additional health check endpoint
    app.get('/health', (req, res) => {
      res.json({ status: 'ok', version: '1.0.0' });
    });
    
    // Start the server
    app.listen(port, host, () => {
      const serverUrl = `http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`;
      console.log(`PerchPics PDS running on http://${host}:${port}`);
      console.log(`HMA webhook configured at: ${webhookUrl}`);
      
      if (config.env.isProduction) {
        console.log('Running in PRODUCTION mode');
      } else {
        console.log('Running in DEVELOPMENT mode');
      }
    });
  } catch (error) {
    console.error('Failed to start PDS server:', error);
    throw error;
  }
};

// Start the server
initPDSServer().catch(err => {
  console.error('Failed to start PDS server:', err);
  process.exit(1);
}); 
