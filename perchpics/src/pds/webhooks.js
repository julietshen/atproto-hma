/**
 * PerchPics PDS Webhooks
 * 
 * This file implements webhook endpoints for the PerchPics PDS.
 * It handles notifications from external services like HMA.
 */

import express from 'express';

// Setup webhook routes
export function setupWebhookRoutes(app, db) {
  // Receive notifications from HMA
  app.post('/webhooks/hma', express.json(), async (req, res) => {
    try {
      const { photoId, matchResult, timestamp } = req.body;
      
      if (!photoId || !matchResult) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      // Get the photo
      const photo = await db.getPhotoById(photoId);
      if (!photo) {
        return res.status(404).json({ error: 'Photo not found' });
      }
      
      // Update the photo record with the match result
      await db.run(
        'UPDATE photos SET hma_matched = ?, hma_action = ?, hma_checked_at = ? WHERE id = ?',
        [
          matchResult.matched ? 1 : 0,
          matchResult.action || 'none',
          timestamp || new Date().toISOString(),
          photoId
        ]
      );
      
      // If there's a match, you might want to take additional actions
      if (matchResult.matched) {
        console.log(`HMA match notification received for photo ${photoId}`);
        
        // Log the match details
        const logEntry = {
          timestamp: new Date().toISOString(),
          photoId,
          matchResult
        };
        
        // Store in the moderation_logs table
        await db.run(
          'INSERT INTO moderation_logs (photo_id, match_data, created_at) VALUES (?, ?, ?)',
          [photoId, JSON.stringify(matchResult), new Date().toISOString()]
        );
      }
      
      res.status(200).json({ status: 'success' });
    } catch (error) {
      console.error('Webhook processing error:', error);
      res.status(500).json({ error: 'Failed to process webhook' });
    }
  });
} 