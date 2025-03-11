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

/**
 * Check if a port is available
 * @param {number} port - Port to check
 * @returns {Promise<boolean>} - True if available, false if not
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
 * Find an available port from the list of ports
 * @param {number[]} ports - List of ports to try
 * @returns {Promise<number>} - First available port found, or null if none available
 */
const findAvailablePort = async (ports) => {
  for (const port of ports) {
    if (await isPortAvailable(port)) {
      return port;
    }
    console.log(`Port ${port} is unavailable, trying next option...`);
  }
  return null; // No available ports found
};

/**
 * Ensure required directories exist
 */
const ensureDirectories = () => {
  const dirs = [
    path.dirname(pdsConfig.db.location),
    pdsConfig.storage.directory,
    pdsConfig.hma.logDirectory
  ];
  
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
};

/**
 * Initialize the PDS server
 */
export const initPDSServer = async () => {
  // Ensure required directories exist
  ensureDirectories();
  
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
  
  app.get('/health/hma', async (req, res) => {
    const hmaHealth = await hmaService.checkHealth();
    
    if (hmaHealth.status === 'ok') {
      res.json({ 
        status: 'ok',
        hma: hmaHealth.details,
        message: 'HMA service is available and responding'
      });
    } else {
      res.status(503).json({
        status: 'error',
        message: 'HMA service is not available',
        error: hmaHealth.error
      });
    }
  });
  
  // AT Protocol standard health endpoint
  app.get('/xrpc/_health', (req, res) => {
    res.json({ status: 'ok', version: '1.0.0' });
  });
  
  try {
    // Create a list of ports to try, starting with the configured port
    const portsToTry = [
      pdsConfig.server.port,
      ...pdsConfig.server.portFallbacks.filter(p => p !== pdsConfig.server.port)
    ];
    
    // Find an available port
    const availablePort = await findAvailablePort(portsToTry);
    
    if (!availablePort) {
      throw new Error('Could not find an available port. Please free up a port or specify a different port range.');
    }
    
    // Update webhook URL if needed
    const webhookUrl = pdsConfig.updateWebhookUrl(availablePort);
    process.env.HMA_WEBHOOK_URL = webhookUrl;
    
    // Start the server
    const server = app.listen(availablePort, () => {
      console.log(`PerchPics PDS running on http://${pdsConfig.server.host}:${availablePort}`);
      console.log(`HMA webhook configured at: ${webhookUrl}`);
    });
    
    return { app, server, db };
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
