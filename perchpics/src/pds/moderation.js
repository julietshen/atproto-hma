/**
 * PerchPics PDS Moderation
 * 
 * This file implements moderation-related routes for the PerchPics PDS.
 * It handles viewing and managing content moderation.
 */

import { authenticateToken } from './auth.js';
import hmaService from '../services/hma.js';
import path from 'path';
import { pdsConfig } from './config.js';

// Setup moderation routes
export function setupModerationRoutes(app, db) {
  // Get all moderation logs (admin only)
  app.get('/moderation/logs', authenticateToken, async (req, res) => {
    try {
      // Check if user is an admin (you would need to implement this)
      // For now, we'll just check if they're the demo user
      if (req.user.username !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;
      
      const logs = await db.getModerationLogs(limit, offset);
      
      res.json({ logs });
    } catch (error) {
      console.error('Get moderation logs error:', error);
      res.status(500).json({ error: 'Failed to get moderation logs' });
    }
  });
  
  // Get moderation logs for a specific photo
  app.get('/moderation/photos/:id/logs', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get the photo
      const photo = await db.getPhotoById(id);
      if (!photo) {
        return res.status(404).json({ error: 'Photo not found' });
      }
      
      // Check if user is the photo owner or an admin
      if (photo.author_did !== req.user.did && req.user.username !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      
      const logs = await db.getModerationLogsForPhoto(id);
      
      res.json({ logs });
    } catch (error) {
      console.error('Get photo moderation logs error:', error);
      res.status(500).json({ error: 'Failed to get photo moderation logs' });
    }
  });
  
  // Get moderation status for a specific photo
  app.get('/moderation/photos/:id/status', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get the photo
      const photo = await db.getPhotoById(id);
      if (!photo) {
        return res.status(404).json({ error: 'Photo not found' });
      }
      
      // Check if user is the photo owner or an admin
      if (photo.author_did !== req.user.did && req.user.username !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      
      // Return the moderation status
      res.json({
        status: {
          checked: photo.hma_checked === 1,
          matched: photo.hma_matched === 1,
          action: photo.hma_action,
          checkedAt: photo.hma_checked_at
        }
      });
    } catch (error) {
      console.error('Get photo moderation status error:', error);
      res.status(500).json({ error: 'Failed to get photo moderation status' });
    }
  });
  
  // Manually process a photo with HMA
  app.post('/moderation/photos/:id/process', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get the photo
      const photo = await db.getPhotoById(id);
      if (!photo) {
        return res.status(404).json({ error: 'Photo not found' });
      }
      
      // Check if user is the photo owner or an admin
      if (photo.author_did !== req.user.did && req.user.username !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      
      // Get the associated blob
      const blob = await db.get('SELECT * FROM blobs WHERE id = ?', [photo.blob_id]);
      if (!blob) {
        return res.status(404).json({ error: 'Blob not found for this photo' });
      }
      
      // Construct the file path
      const filePath = path.join(pdsConfig.storage.directory, photo.blob_id);
      
      // Create image info object for HMA
      const imageInfo = {
        uri: `at://${photo.author_did}/app.perchpics.photo/${photo.id}`,
        userDid: photo.author_did,
        photoId: photo.id,
        blobId: photo.blob_id
      };
      
      // Process the image with HMA
      const hmaResult = await hmaService.processImage(filePath, imageInfo);
      
      // Update the photo record with HMA result
      await db.run(
        'UPDATE photos SET hma_checked = ?, hma_matched = ?, hma_action = ?, hma_checked_at = ? WHERE id = ?',
        [
          true, 
          hmaResult.matched ? 1 : 0, 
          hmaResult.action || 'none', 
          new Date().toISOString(), 
          photo.id
        ]
      );
      
      // If there's a match, store it in the moderation logs
      if (hmaResult.matched) {
        await db.run(
          'INSERT INTO moderation_logs (photo_id, match_data, created_at) VALUES (?, ?, ?)',
          [photo.id, JSON.stringify(hmaResult), new Date().toISOString()]
        );
      }
      
      res.json({
        status: 'success',
        result: hmaResult
      });
    } catch (error) {
      console.error('Manual HMA processing error:', error);
      res.status(500).json({ 
        error: 'Failed to process photo with HMA',
        message: error.message
      });
    }
  });
  
  // Batch process photos with HMA (admin only)
  app.post('/moderation/photos/batch-process', authenticateToken, async (req, res) => {
    try {
      // Check if user is an admin
      if (req.user.username !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized - Admin access required' });
      }
      
      // Get request parameters
      const { 
        limit = 10, 
        offset = 0, 
        concurrency = 3,
        filterChecked = true, // Skip already checked photos by default
        batchId = `batch-${Date.now()}` // Unique ID for this batch
      } = req.body;
      
      // Query for photos that need processing
      let query = 'SELECT * FROM photos';
      const queryParams = [];
      
      if (filterChecked) {
        query += ' WHERE hma_checked = 0 OR hma_checked IS NULL';
      }
      
      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      queryParams.push(limit, offset);
      
      const photos = await db.all(query, queryParams);
      
      if (photos.length === 0) {
        return res.json({
          status: 'success',
          message: 'No photos found for batch processing',
          batchId,
          count: 0
        });
      }
      
      // Create batch data structure for processing
      const imagesToProcess = [];
      
      for (const photo of photos) {
        // Construct the file path
        const filePath = path.join(pdsConfig.storage.directory, photo.blob_id);
        
        // Create image info object
        const imageInfo = {
          uri: `at://${photo.author_did}/app.perchpics.photo/${photo.id}`,
          userDid: photo.author_did,
          photoId: photo.id,
          blobId: photo.blob_id,
          batchId
        };
        
        imagesToProcess.push({
          imagePath: filePath,
          imageInfo
        });
      }
      
      // Start batch processing without waiting for completion
      res.json({
        status: 'processing',
        message: `Started batch processing of ${photos.length} photos`,
        batchId,
        count: photos.length
      });
      
      // Process the batch in the background
      hmaService.processBatch(imagesToProcess, { concurrency })
        .then(results => {
          console.log(`Batch ${batchId} completed: ${results.length} photos processed`);
          
          // Update the database with results
          const updatePromises = results.map(item => {
            if (!item.success) {
              console.error(`Error processing photo ${item.imageInfo.photoId}:`, item.error);
              return db.run(
                'UPDATE photos SET hma_checked = ?, hma_checked_at = ? WHERE id = ?',
                [true, new Date().toISOString(), item.imageInfo.photoId]
              );
            }
            
            const result = item.result;
            
            // Update photo record
            const updatePromise = db.run(
              'UPDATE photos SET hma_checked = ?, hma_matched = ?, hma_action = ?, hma_checked_at = ? WHERE id = ?',
              [
                true, 
                result.matched ? 1 : 0, 
                result.action || 'none', 
                new Date().toISOString(), 
                item.imageInfo.photoId
              ]
            );
            
            // If there's a match, log it
            if (result.matched) {
              return updatePromise.then(() => 
                db.run(
                  'INSERT INTO moderation_logs (photo_id, match_data, created_at) VALUES (?, ?, ?)',
                  [item.imageInfo.photoId, JSON.stringify(result), new Date().toISOString()]
                )
              );
            }
            
            return updatePromise;
          });
          
          return Promise.allSettled(updatePromises);
        })
        .catch(error => {
          console.error(`Batch ${batchId} processing error:`, error);
        });
        
    } catch (error) {
      console.error('Batch processing error:', error);
      res.status(500).json({ 
        error: 'Failed to start batch processing',
        message: error.message
      });
    }
  });
  
  // Get batch processing status (admin only)
  app.get('/moderation/batch/:batchId/status', authenticateToken, async (req, res) => {
    try {
      // Check if user is an admin
      if (req.user.username !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized - Admin access required' });
      }
      
      const { batchId } = req.params;
      
      // Check the batch logs to determine status
      const batchLogs = await db.all(
        "SELECT * FROM moderation_logs WHERE match_data LIKE ? ORDER BY created_at DESC",
        [`%${batchId}%`]
      );
      
      res.json({
        status: 'success',
        batchId,
        processed: batchLogs.length,
        logs: batchLogs.slice(0, 10) // Return the 10 most recent logs
      });
    } catch (error) {
      console.error('Batch status error:', error);
      res.status(500).json({ 
        error: 'Failed to get batch status',
        message: error.message
      });
    }
  });
  
  // Get moderation stats (admin only)
  app.get('/moderation/stats', authenticateToken, async (req, res) => {
    try {
      // Check if user is an admin
      if (req.user.username !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized - Admin access required' });
      }
      
      const stats = await db.getModerationStats();
      
      res.json({
        status: 'success',
        stats
      });
    } catch (error) {
      console.error('Get moderation stats error:', error);
      res.status(500).json({ 
        error: 'Failed to get moderation stats',
        message: error.message
      });
    }
  });
} 