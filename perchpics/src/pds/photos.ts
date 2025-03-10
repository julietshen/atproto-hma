/**
 * PerchPics PDS Photos
 * 
 * This file implements photo-related routes for the PerchPics PDS.
 * It handles photo uploads, retrieval, and management.
 */

import fs from 'fs';
import path from 'path';
import multer from 'multer';
import crypto from 'crypto';
import { Request, Response, Express, RequestHandler } from 'express';
import { pdsConfig } from './config.js';
import { authenticateToken } from './auth.js';
import { PDSDB, PhotoData } from './database.js';

// Request with user property
interface AuthRequest extends Request {
  user?: {
    username: string;
    did: string;
  };
  file?: Express.Multer.File;
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    cb(null, pdsConfig.storage.directory);
  },
  filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const ext = path.extname(file.originalname);
    const id = crypto.randomBytes(16).toString('hex');
    cb(null, `${id}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: pdsConfig.storage.maxSize
  },
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (pdsConfig.storage.allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'));
    }
  }
});

// Setup photo routes
export function setupPhotoRoutes(app: Express, db: PDSDB): void {
  // Upload a photo
  app.post('/photos', authenticateToken, upload.single('image'), (async (req: AuthRequest, res: Response) => {
    try {
      const { did } = req.user!;
      const { caption, altText, location, tags } = req.body;
      
      // Validate input
      if (!req.file) {
        return res.status(400).json({ error: 'Image file is required' });
      }
      
      if (!caption) {
        return res.status(400).json({ error: 'Caption is required' });
      }
      
      // Create blob record
      const blobId = path.basename(req.file.path);
      await db.run(
        'INSERT INTO blobs (id, size, mime_type, created_at) VALUES (?, ?, ?, ?)',
        [blobId, req.file.size, req.file.mimetype, new Date().toISOString()]
      );
      
      // Create photo record
      const photoData: PhotoData = {
        caption,
        altText: altText || null,
        location: location || null,
        tags: tags ? JSON.parse(tags) : [],
        blobId,
        createdAt: new Date().toISOString()
      };
      
      const result = await db.createPhoto(did, photoData);
      
      // Return the photo ID
      res.status(201).json({ id: result.id });
    } catch (error) {
      console.error('Photo upload error:', error);
      res.status(500).json({ error: 'Failed to upload photo' });
    }
  }) as RequestHandler);
  
  // Get a photo by ID
  app.get('/photos/:id', (async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // Get the photo
      const photo = await db.getPhotoById(id);
      if (!photo) {
        return res.status(404).json({ error: 'Photo not found' });
      }
      
      // Return the photo
      res.json({ photo });
    } catch (error) {
      console.error('Get photo error:', error);
      res.status(500).json({ error: 'Failed to get photo' });
    }
  }) as RequestHandler);
  
  // Get photos by user
  app.get('/users/:did/photos', (async (req: Request, res: Response) => {
    try {
      const { did } = req.params;
      
      // Get the photos
      const photos = await db.getPhotosByUser(did);
      
      // Return the photos
      res.json({ photos });
    } catch (error) {
      console.error('Get user photos error:', error);
      res.status(500).json({ error: 'Failed to get user photos' });
    }
  }) as RequestHandler);
  
  // Get all photos (timeline)
  app.get('/photos', (async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const cursor = req.query.cursor as string | undefined;
      
      // Get the photos
      const photos = await db.getAllPhotos(limit, cursor);
      
      // Return the photos
      res.json({ 
        photos,
        cursor: photos.length > 0 ? photos[photos.length - 1].created_at : null
      });
    } catch (error) {
      console.error('Get photos error:', error);
      res.status(500).json({ error: 'Failed to get photos' });
    }
  }) as RequestHandler);
  
  // Serve photo files
  app.get('/blobs/:id', ((req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const filePath = path.join(pdsConfig.storage.directory, id);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
      }
      
      // Serve the file
      res.sendFile(filePath);
    } catch (error) {
      console.error('Serve file error:', error);
      res.status(500).json({ error: 'Failed to serve file' });
    }
  }) as RequestHandler);
} 