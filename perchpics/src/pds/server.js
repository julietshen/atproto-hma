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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import PDS modules
import { pdsConfig } from './config.js';
import { createDatabase } from './database.js';
import { setupAuthRoutes } from './auth.js';
import { setupPhotoRoutes } from './photos.js';

// Create directories if they don't exist
const ensureDirectories = () => {
  const dirs = [
    path.dirname(pdsConfig.db.location),
    pdsConfig.storage.directory
  ];
  
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
};

// Initialize the PDS server
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
  
  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', version: '1.0.0' });
  });
  
  // Start the server
  const server = app.listen(pdsConfig.server.port, () => {
    console.log(`PerchPics PDS running on http://${pdsConfig.server.host}:${pdsConfig.server.port}`);
  });
  
  return { app, server, db };
};

// Start the server
initPDSServer().catch(err => {
  console.error('Failed to start PDS server:', err);
  process.exit(1);
}); 