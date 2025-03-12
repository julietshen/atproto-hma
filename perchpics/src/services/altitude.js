/**
 * Altitude Service for PerchPics
 * 
 * This service handles communication with the Altitude API for content moderation.
 * It provides methods to submit images to Altitude for review and process verdicts.
 */

import fetch from 'node-fetch';
import fs from 'fs';
import FormData from 'form-data';
import { altitudeConfig } from '../pds/config.js';

/**
 * AltitudeService class for handling interactions with Altitude
 */
class AltitudeService {
  constructor() {
    this.apiUrl = altitudeConfig.url;
    this.apiKey = altitudeConfig.apiKey;
    this.enabled = altitudeConfig.enabled;
    this.webhookEndpoint = altitudeConfig.webhookEndpoint;
  }
  
  /**
   * Submit an image to Altitude for review
   * @param {string} imagePath - Path to the image file
   * @param {object} metadata - Metadata about the image
   * @returns {Promise<object>} - Response from Altitude
   */
  async submitImage(imagePath, metadata) {
    if (!this.enabled) {
      console.log('Altitude integration is disabled');
      return { success: false, message: 'Altitude integration is disabled' };
    }
    
    try {
      // Check if image exists
      if (!fs.existsSync(imagePath)) {
        throw new Error(`Image file not found: ${imagePath}`);
      }
      
      // Convert image to base64
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');
      
      // Prepare payload for Altitude
      const payload = {
        title: `Image from ${metadata.userDid}`,
        description: `AT Protocol image - ${metadata.photoId}`,
        client_context: metadata.uri,
        content_type: 'IMAGE',
        content_bytes: base64Image,
        creator: {
          ip_address: metadata.ipAddress || 'unknown'
        }
      };
      
      // Submit to Altitude API
      const response = await fetch(`${this.apiUrl}/api/targets/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.apiKey ? `Bearer ${this.apiKey}` : undefined
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Altitude API error (${response.status}): ${errorText}`);
      }
      
      const result = await response.json();
      console.log(`Successfully submitted image to Altitude: ${metadata.photoId}`);
      
      return {
        success: true,
        altitude_id: result.id,
        message: 'Image submitted to Altitude for review'
      };
    } catch (error) {
      console.error(`Error submitting to Altitude: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Process an HMA match result and send to Altitude if necessary
   * @param {object} hmaResult - The result from HMA
   * @param {string} imagePath - Path to the image file
   * @param {object} metadata - Metadata about the image
   * @returns {Promise<object>} - Processed result
   */
  async processHmaMatch(hmaResult, imagePath, metadata) {
    // If no match or Altitude disabled, just return the HMA result
    if (!hmaResult.matched || !this.enabled) {
      return hmaResult;
    }
    
    // If there's a match, submit to Altitude
    const altitudeResult = await this.submitImage(imagePath, metadata);
    
    // Return combined result
    return {
      ...hmaResult,
      altitude: altitudeResult
    };
  }

  /**
   * Check health of the Altitude service
   * @returns {Promise<object>} - Health status of Altitude
   */
  async checkHealth() {
    if (!this.enabled) {
      return { status: 'disabled', message: 'Altitude integration is disabled' };
    }
    
    try {
      const response = await fetch(`${this.apiUrl}/api/health`, {
        headers: {
          'Authorization': this.apiKey ? `Bearer ${this.apiKey}` : undefined
        }
      });
      
      if (!response.ok) {
        throw new Error(`Health check failed with status: ${response.status}`);
      }
      
      return { status: 'healthy', message: 'Altitude service is functioning properly' };
    } catch (error) {
      console.error(`Altitude health check failed: ${error.message}`);
      return { status: 'unhealthy', message: error.message };
    }
  }
  
  /**
   * Get moderation queue statistics from Altitude
   * @returns {Promise<object>} - Moderation statistics
   */
  async getStats() {
    if (!this.enabled) {
      return {
        pending: 0,
        approved: 0,
        rejected: 0,
        total: 0
      };
    }
    
    try {
      const response = await fetch(`${this.apiUrl}/api/moderation/stats`, {
        headers: {
          'Authorization': this.apiKey ? `Bearer ${this.apiKey}` : undefined
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get stats with status: ${response.status}`);
      }
      
      const data = await response.json();
      return {
        pending: data.pending || 0,
        approved: data.approved || 0,
        rejected: data.rejected || 0,
        total: data.total || 0
      };
    } catch (error) {
      console.error(`Error getting moderation stats: ${error.message}`);
      // Return default stats on error
      return {
        pending: 0,
        approved: 0,
        rejected: 0,
        total: 0
      };
    }
  }
  
  /**
   * Approve content in Altitude
   * @param {string} id - Content ID to approve
   * @param {string} notes - Optional moderator notes
   * @returns {Promise<object>} - Result of the approval
   */
  async approveContent(id, notes = '') {
    return this.takeAction(id, 'approve', notes);
  }
  
  /**
   * Reject content in Altitude
   * @param {string} id - Content ID to reject
   * @param {string} notes - Optional moderator notes
   * @returns {Promise<object>} - Result of the rejection
   */
  async rejectContent(id, notes = '') {
    return this.takeAction(id, 'reject', notes);
  }
  
  /**
   * Escalate content in Altitude
   * @param {string} id - Content ID to escalate
   * @param {string} notes - Optional moderator notes
   * @returns {Promise<object>} - Result of the escalation
   */
  async escalateContent(id, notes = '') {
    return this.takeAction(id, 'escalate', notes);
  }
  
  /**
   * Take a moderation action in Altitude
   * @param {string} id - Content ID
   * @param {string} action - Action to take (approve/reject/escalate)
   * @param {string} notes - Optional moderator notes
   * @returns {Promise<object>} - Result of the action
   */
  async takeAction(id, action, notes = '') {
    if (!this.enabled) {
      return { success: false, message: 'Altitude integration is disabled' };
    }
    
    try {
      const response = await fetch(`${this.apiUrl}/api/moderation/${id}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.apiKey ? `Bearer ${this.apiKey}` : undefined
        },
        body: JSON.stringify({ notes })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Action failed with status ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      return {
        success: true,
        message: `Content ${action}ed successfully`,
        ...result
      };
    } catch (error) {
      console.error(`Error taking action ${action} on content ${id}: ${error.message}`);
      return {
        success: false,
        message: `Failed to ${action} content: ${error.message}`
      };
    }
  }
  
  /**
   * Get the Altitude UI URL for embedding
   * @returns {string} - The URL to the Altitude UI
   */
  getAltitudeUrl() {
    return this.apiUrl;
  }
}

// Create and export singleton instance
const altitudeService = new AltitudeService();
export default altitudeService; 