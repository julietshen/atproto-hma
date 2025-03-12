// Import required modules
import express from 'express';
import { authenticateToken } from './auth.js';
import { altitudeConfig } from './config.js';

/**
 * Setup API routes for the PDS
 * @param {object} app - Express application
 * @param {object} db - Database instance
 */
export function setupApiRoutes(app, db) {
  const router = express.Router();
  
  // Authenticate all API routes
  router.use(authenticateToken);
  
  // Get current user role (for admin checks)
  router.get('/user/role', async (req, res) => {
    try {
      // Check if user is admin - in a real app, you would check against a database
      // For this example, we'll consider 'admin' username as admin
      const isAdmin = req.user.username === 'admin';
      
      res.json({
        role: isAdmin ? 'admin' : 'user',
        did: req.user.did
      });
    } catch (error) {
      console.error('Error getting user role:', error);
      res.status(500).json({ error: 'Failed to get user role' });
    }
  });
  
  // Get Altitude configuration (admin only)
  router.get('/config/altitude', async (req, res) => {
    try {
      // Check if user is admin
      if (req.user.username !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      
      // Return Altitude configuration
      res.json({
        url: altitudeConfig.url,
        enabled: altitudeConfig.enabled
      });
    } catch (error) {
      console.error('Error getting Altitude config:', error);
      res.status(500).json({ error: 'Failed to get Altitude configuration' });
    }
  });
  
  // Webhook endpoint for Altitude verdicts
  router.post('/altitude/webhook', express.json(), async (req, res) => {
    try {
      // Validate request
      if (!req.body || !req.body.client_context || !req.body.decision) {
        return res.status(400).json({ error: 'Invalid request' });
      }
      
      const { client_context, decision, decision_time } = req.body;
      
      // Extract photo URI from client_context
      // Assuming format: at://{did}/app.perchpics.photo/{id}
      const parts = client_context.split('/');
      if (parts.length < 4) {
        return res.status(400).json({ error: 'Invalid client_context format' });
      }
      
      const photoId = parts[parts.length - 1];
      
      // Update photo record with moderation decision
      const updateResult = await db.run(
        'UPDATE photos SET moderation_status = ?, moderation_time = ? WHERE id = ?',
        [decision, decision_time || new Date().toISOString(), photoId]
      );
      
      // Log the moderation decision
      await db.run(
        'INSERT INTO moderation_logs (photo_id, decision, decision_time, source) VALUES (?, ?, ?, ?)',
        [photoId, decision, decision_time || new Date().toISOString(), 'ALTITUDE']
      );
      
      res.status(200).json({ success: true, message: 'Decision recorded' });
    } catch (error) {
      console.error('Error processing Altitude webhook:', error);
      res.status(500).json({ error: 'Failed to process webhook' });
    }
  });
  
  // Add router to app
  app.use('/api', router);
} 