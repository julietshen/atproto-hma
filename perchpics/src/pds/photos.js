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
import { config } from '../config.js';
import { authenticateToken } from './auth.js';
import hmaService from '../services/hma.js';
import altitudeService from './services/altitude.js';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.storage.directory);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const id = crypto.randomBytes(16).toString('hex');
    cb(null, `${id}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: config.storage.maxSize
  },
  fileFilter: (req, file, cb) => {
    if (config.storage.allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed. Allowed types: ${config.storage.allowedTypes.join(', ')}`));
    }
  }
});

// Setup photo routes
export function setupPhotoRoutes(app, db) {
  // Upload a photo
  app.post('/photos', authenticateToken, upload.single('image'), async (req, res) => {
    try {
      const { did } = req.user;
      const { caption, altText, location, tags } = req.body;
      
      // Validate input
      if (!req.file) {
        return res.status(400).json({ error: 'Image file is required' });
      }
      
      // Caption is now optional
      
      // Create blob record
      const blobId = path.basename(req.file.path);
      await db.run(
        'INSERT INTO blobs (id, size, mime_type, created_at) VALUES (?, ?, ?, ?)',
        [blobId, req.file.size, req.file.mimetype, new Date().toISOString()]
      );
      
      // Create photo record
      const photoData = {
        caption: caption || '', // Provide default empty string if caption is not provided
        altText: altText || null,
        location: location || null,
        tags: tags ? JSON.parse(tags) : [],
        blobId,
        createdAt: new Date().toISOString()
      };
      
      const result = await db.createPhoto(did, photoData);
      
      // Construct the AT Protocol URI for this photo
      const photoUri = `at://${did}/app.perchpics.photo/${result.id}`;
      
      // Process image with HMA - do this asynchronously without blocking the response
      try {
        // Create image info object for HMA
        const imageInfo = {
          uri: photoUri,
          userDid: did,
          photoId: result.id,
          blobId: blobId,
          ipAddress: req.ip
        };
        
        // Process the image with HMA in the background
        hmaService.processImage(req.file.path, imageInfo)
          .then(async hmaResult => {
            // Safely handle the result, ensuring it exists and has expected properties
            if (hmaResult && hmaResult.matched) {
              console.log(`HMA match found for image ${blobId} from user ${did}`);
              
              // Update the photo record with HMA result
              db.run(
                'UPDATE photos SET hma_checked = ?, hma_matched = ?, hma_action = ?, hma_checked_at = ? WHERE id = ?',
                [true, true, hmaResult.action || 'none', new Date().toISOString(), result.id]
              ).catch(err => {
                console.error('Error updating photo with HMA results:', err);
              });
              
              // Store the match details in the moderation_logs table
              db.run(
                'INSERT INTO moderation_logs (photo_id, match_data, created_at) VALUES (?, ?, ?)',
                [result.id, JSON.stringify(hmaResult), new Date().toISOString()]
              ).catch(err => {
                console.error('Error logging HMA match:', err);
              });
              
              // Send to Altitude for review if HMA matched
              try {
                const altitudeResult = await altitudeService.processHmaMatch(
                  hmaResult, 
                  req.file.path,
                  {
                    uri: photoUri,
                    userDid: did,
                    photoId: result.id,
                    ipAddress: req.ip
                  }
                );
                
                // Log Altitude submission if successful
                if (altitudeResult.altitude?.success) {
                  console.log(`Image ${blobId} submitted to Altitude for review`);
                  
                  // Update photo with Altitude submission info
                  db.run(
                    'UPDATE photos SET altitude_submitted = ?, altitude_id = ? WHERE id = ?',
                    [true, altitudeResult.altitude.altitude_id, result.id]
                  ).catch(err => {
                    console.error('Error updating photo with Altitude submission:', err);
                  });
                }
              } catch (altitudeError) {
                console.error(`Error submitting to Altitude: ${altitudeError.message}`);
              }
            } else {
              // No match or invalid result, still mark as checked
              db.run(
                'UPDATE photos SET hma_checked = ?, hma_checked_at = ? WHERE id = ?',
                [true, new Date().toISOString(), result.id]
              ).catch(err => {
                console.error('Error updating photo HMA check status:', err);
              });
            }
          })
          .catch(err => {
            console.error('Error processing image with HMA:', err);
          });
      } catch (hmaError) {
        console.error('Error initiating HMA processing:', hmaError);
      }
      
      // Return the photo ID
      res.status(201).json({ id: result.id });
    } catch (error) {
      console.error('Photo upload error:', error);
      res.status(500).json({ error: 'Failed to upload photo' });
    }
  });
  
  // Get a photo by ID
  app.get('/photos/:id', async (req, res) => {
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
  });
  
  // Get photos by user
  app.get('/users/:did/photos', async (req, res) => {
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
  });
  
  // Get all photos (timeline)
  app.get('/photos', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const cursor = req.query.cursor;
      
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
  });
  
  // Serve photo files
  app.get('/blobs/:id', (req, res) => {
    try {
      const { id } = req.params;
      const filePath = path.join(config.storage.directory, id);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
      }
      
      // Serve the file (using absolute path)
      res.sendFile(path.resolve(filePath));
    } catch (error) {
      console.error('Serve file error:', error);
      res.status(500).json({ error: 'Failed to serve file' });
    }
  });
} 