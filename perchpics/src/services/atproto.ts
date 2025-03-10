/**
 * PerchPics Custom AT Protocol Service
 * 
 * This service handles interactions with our custom PDS (Personal Data Server)
 * instead of using the standard AT Protocol. This ensures that photos posted
 * on PerchPics remain exclusive to our application.
 */

// API base URL for our custom PDS
const PDS_URL = 'http://localhost:3001';

/**
 * Custom AT Protocol service for PerchPics
 * 
 * This service provides methods for authentication, image uploads,
 * post creation, and fetching data from our custom PDS.
 */
class PerchPicsService {
  private token: string | null = null;
  private user: any = null;

  constructor() {
    // Try to restore session from localStorage
    const storedToken = localStorage.getItem('perchpics_token');
    const storedUser = localStorage.getItem('perchpics_user');
    
    if (storedToken && storedUser) {
      try {
        this.token = storedToken;
        this.user = JSON.parse(storedUser);
      } catch (error) {
        console.error('Failed to restore session:', error);
        this.clearSession();
      }
    }
  }

  /**
   * Check if the user is currently logged in
   * @returns {boolean} True if the user is logged in
   */
  isLoggedIn(): boolean {
    return this.token !== null && this.user !== null;
  }

  /**
   * Get the DID (Decentralized Identifier) of the current user
   * @returns {string | undefined} The user's DID or undefined if not logged in
   */
  getCurrentUserDid(): string | undefined {
    return this.user?.did;
  }

  /**
   * Register a new user
   * @param {string} username - The desired username
   * @param {string} password - The user's password
   * @returns {Promise<boolean>} True if registration was successful
   */
  async register(username: string, password: string): Promise<boolean> {
    try {
      const response = await fetch(`${PDS_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Registration failed');
      }
      
      const data = await response.json();
      
      // Store the token and user info
      this.token = data.token;
      this.user = data.user;
      
      // Save to localStorage
      localStorage.setItem('perchpics_token', this.token);
      localStorage.setItem('perchpics_user', JSON.stringify(this.user));
      
      return true;
    } catch (error) {
      console.error('Registration failed:', error);
      return false;
    }
  }

  /**
   * Log in with username and password
   * @param {string} username - The user's username
   * @param {string} password - The user's password
   * @returns {Promise<boolean>} True if login was successful
   */
  async login(username: string, password: string): Promise<boolean> {
    try {
      const response = await fetch(`${PDS_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }
      
      const data = await response.json();
      
      // Store the token and user info
      this.token = data.token;
      this.user = data.user;
      
      // Save to localStorage
      localStorage.setItem('perchpics_token', this.token);
      localStorage.setItem('perchpics_user', JSON.stringify(this.user));
      
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  }

  /**
   * Log out the current user
   */
  logout(): void {
    this.clearSession();
  }

  /**
   * Clear the current session
   */
  private clearSession(): void {
    this.token = null;
    this.user = null;
    localStorage.removeItem('perchpics_token');
    localStorage.removeItem('perchpics_user');
  }

  /**
   * Upload an image to the PDS
   * @param {File} file - The image file to upload
   * @param {string} caption - The caption for the image
   * @param {string} altText - Alt text for accessibility
   * @returns {Promise<any>} The uploaded photo data
   */
  async uploadImage(file: File, caption?: string, altText?: string): Promise<any> {
    if (!this.isLoggedIn()) {
      throw new Error('User must be logged in to upload images');
    }

    try {
      const formData = new FormData();
      formData.append('image', file);
      
      // Only add caption and altText if provided
      if (caption) {
        formData.append('caption', caption);
      }
      
      if (altText) {
        formData.append('altText', altText);
      }

      const response = await fetch(`${PDS_URL}/photos`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`
        },
        body: formData,
        credentials: 'include',
        mode: 'cors'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Upload failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to upload image:', error);
      throw error;
    }
  }

  /**
   * Get the user's timeline (all photos)
   * @param {number} limit - Maximum number of photos to fetch
   * @param {string} cursor - Cursor for pagination
   * @returns {Promise<any>} Timeline data
   */
  async getTimeline(limit: number = 50, cursor?: string): Promise<any> {
    try {
      let url = `${PDS_URL}/photos?limit=${limit}`;
      if (cursor) {
        url += `&cursor=${cursor}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get timeline');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to get timeline:', error);
      return { photos: [] };
    }
  }

  /**
   * Get a user's profile
   * @param {string} did - The DID of the user
   * @returns {Promise<any>} The user's profile data
   */
  async getProfile(did: string): Promise<any> {
    try {
      const response = await fetch(`${PDS_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get profile');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to get profile:', error);
      throw error;
    }
  }

  /**
   * Get posts created by a specific user
   * @param {string} did - The DID of the user
   * @returns {Promise<any[]>} Array of the user's posts
   */
  async getUserPosts(did: string): Promise<any[]> {
    try {
      const response = await fetch(`${PDS_URL}/users/${did}/photos`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get user posts');
      }
      
      const data = await response.json();
      return data.photos;
    } catch (error) {
      console.error('Failed to get user posts:', error);
      return [];
    }
  }

  /**
   * Like a photo
   * @param {string} photoId - The ID of the photo
   * @returns {Promise<boolean>} True if like was successful
   */
  async likePost(photoId: string): Promise<boolean> {
    // This would be implemented in a real application
    // For now, we'll just return true
    return true;
  }

  /**
   * Repost a photo
   * @param {string} photoId - The ID of the photo
   * @returns {Promise<boolean>} True if repost was successful
   */
  async repostPost(photoId: string): Promise<boolean> {
    // This would be implemented in a real application
    // For now, we'll just return true
    return true;
  }
}

// Create a singleton instance for use throughout the app
const perchPicsService = new PerchPicsService();
export default perchPicsService; 