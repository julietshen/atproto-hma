/**
 * PerchPics API Service
 * 
 * This service handles all API calls to the PDS server.
 * It provides a clean interface for the frontend components to interact with the backend.
 */

import { ApiError } from '../../utils/errors';
import { config } from '../../config';

// Types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
}

export interface UploadPhotoRequest {
  image: File;
  caption?: string;
  altText?: string;
  tags?: string[];
}

/**
 * Base API service with common functionality
 */
class ApiService {
  private baseUrl: string;
  private token: string | null = null;

  constructor() {
    this.baseUrl = config.api.pdsUrl;
    // Try to restore token from localStorage
    this.token = localStorage.getItem('perchpics_token');
  }

  /**
   * Set the authentication token
   */
  setToken(token: string | null): void {
    this.token = token;
    if (token) {
      localStorage.setItem('perchpics_token', token);
    } else {
      localStorage.removeItem('perchpics_token');
    }
  }

  /**
   * Get the authentication token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Make a GET request to the API
   */
  async get<T>(endpoint: string, params?: Record<string, string>): Promise<ApiResponse<T>> {
    try {
      const url = new URL(`${this.baseUrl}${endpoint}`);
      
      // Add query parameters if provided
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          url.searchParams.append(key, value);
        });
      }
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      // Add authorization header if token exists
      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new ApiError(data.error || 'Unknown error', response.status);
      }
      
      return {
        data,
        success: true,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        return {
          error: error.message,
          success: false,
        };
      }
      
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  /**
   * Make a POST request to the API
   */
  async post<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      // Add authorization header if token exists
      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }
      
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new ApiError(data.error || 'Unknown error', response.status);
      }
      
      return {
        data,
        success: true,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        return {
          error: error.message,
          success: false,
        };
      }
      
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  /**
   * Upload a file to the API
   */
  async uploadFile<T>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> {
    try {
      const headers: HeadersInit = {};
      
      // Add authorization header if token exists
      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }
      
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers,
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new ApiError(data.error || 'Unknown error', response.status);
      }
      
      return {
        data,
        success: true,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        return {
          error: error.message,
          success: false,
        };
      }
      
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }
}

// Create and export the API service instance
const apiService = new ApiService();
export default apiService; 