/**
 * PerchPics PDS Configuration
 * 
 * This file contains configuration settings for the PerchPics PDS.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration interface
export interface PDSConfig {
  server: {
    host: string;
    port: number;
  };
  cors: {
    origin: string[];
    methods: string[];
    allowedHeaders: string[];
  };
  db: {
    location: string;
  };
  storage: {
    directory: string;
    maxSize: number;
    allowedTypes: string[];
  };
  auth: {
    secret: string;
    tokenExpiration: string;
  };
}

// PDS configuration
export const pdsConfig: PDSConfig = {
  // Server settings
  server: {
    host: 'localhost',
    port: 3001
  },
  
  // CORS settings
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  
  // Database settings
  db: {
    location: path.join(__dirname, '../../data/perchpics.db')
  },
  
  // Storage settings
  storage: {
    directory: path.join(__dirname, '../../data/blobs'),
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
  },
  
  // Authentication settings
  auth: {
    secret: 'perchpics-secret-key-change-in-production',
    tokenExpiration: '7d'
  }
};

export default pdsConfig; 