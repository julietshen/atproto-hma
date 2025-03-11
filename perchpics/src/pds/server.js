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
import { pdsConfig } from './config.js';
import { createDatabase } from './database.js';
import { setupAuthRoutes } from './auth.js';
import { setupPhotoRoutes } from './photos.js';
import { setupWebhookRoutes } from './webhooks.js';
import { setupModerationRoutes } from './moderation.js';
import hmaService from '../services/hma.js';
import { startMemoryMonitor, logMemoryUsage } from '../utils/memory-monitor.js';

// Constants
const MEMORY_CHECK_INTERVAL_MS = 60000; // 1 minute
const MEMORY_WARNING_THRESHOLD_MB = 1024; // 1 GB

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
  const blobsDir = pdsConfig.storage.directory;
  if (!fs.existsSync(blobsDir)) {
    fs.mkdirSync(blobsDir, { recursive: true });
  }
};

/**
 * Initialize the PDS server
 */
export const initPDSServer = async () => {
  try {
    // Start memory monitor
    const memoryMonitor = startMemoryMonitor(MEMORY_CHECK_INTERVAL_MS, MEMORY_WARNING_THRESHOLD_MB);
    console.log('Memory monitoring enabled');
    
    // Ensure required directories exist
    ensureDirectories();
    
    // Use the configured port directly - no fallbacks in production
    const port = parseInt(process.env.PDS_PORT || process.env.PORT || '3002', 10);
    const host = process.env.HOST || 'localhost';
    
    // Enable startup diagnostics to check health of dependent services
    const startupDiagnostics = true;
    
    // Check if port is available in development mode
    if (process.env.NODE_ENV !== 'production') {
      const isAvailable = await isPortAvailable(port);
      if (!isAvailable) {
        console.error(`Port ${port} is already in use. Please configure a different port in your .env file.`);
        throw new Error(`Port ${port} is already in use`);
      }
    }
    
    // Update webhook URL based on actual port
    const webhookUrl = pdsConfig.updateWebhookUrl(port);
    
    // Run startup diagnostics
    if (startupDiagnostics) {
      try {
        // Check HMA service health
        let healthResult = await hmaService.checkHealth();
        
        if (healthResult.success) {
          console.log(`HMA service health check result: ok`);
        } else {
          console.warn(`Warning: Unable to connect to HMA service. Image hashing may not work.`);
          console.error(`HMA Error: ${healthResult.error.message}`);
        }
      } catch (error) {
        console.warn(`Warning: Unable to connect to HMA service. Image hashing may not work.`);
        console.error(`HMA Error: ${error.message}`);
      }
    }
    
    // Initialize database
    const db = await createDatabase();
    
    // Create Express app
    const app = express();
    
    // Configure middleware
    app.use(cors(pdsConfig.cors));
    app.use(bodyParser.json());
    
    // Set up routes
    setupAuthRoutes(app, db);
    setupPhotoRoutes(app, db);
    setupWebhookRoutes(app, db);
    setupModerationRoutes(app, db);
    
    // Health check endpoints
    app.get('/health', (req, res) => {
      res.json({ status: 'ok', version: '1.0.0' });
    });
    
    // Start the server
    app.listen(port, host, () => {
      const serverUrl = `http://${host}:${port}`;
      console.log(`PerchPics PDS running on ${serverUrl}`);
      console.log(`HMA webhook configured at: ${webhookUrl}`);
      
      if (process.env.NODE_ENV === 'production') {
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
