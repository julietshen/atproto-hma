/**
 * PerchPics PDS Moderation
 * 
 * This file implements moderation-related routes for the PerchPics PDS.
 * It handles viewing and managing content moderation.
 */

import { authenticateToken } from './auth.js';

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
} 