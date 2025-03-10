import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import atProtoService from '../../services/atproto';

// Mock the fetch function
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('PerchPicsService - Upload Functionality', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    
    // Reset the fetch mock
    mockFetch.mockReset();
    
    // Set up initial state with logged in user
    localStorage.setItem('perchpics_token', 'test-token');
    localStorage.setItem('perchpics_user', JSON.stringify({ did: 'did:test:123', username: 'testuser' }));
    
    // Force a new instance to pick up the localStorage values
    Object.defineProperty(atProtoService, 'token', { value: 'test-token' });
    Object.defineProperty(atProtoService, 'user', { value: { did: 'did:test:123', username: 'testuser' } });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadImage', () => {
    // Test 1: Normal expected input - successful upload
    it('should upload an image successfully with valid inputs', async () => {
      // Create a mock file
      const mockFile = new File(['test image content'], 'test-image.jpg', { type: 'image/jpeg' });
      const caption = 'Test caption';
      const altText = 'Test alt text';
      
      // Mock successful upload response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'photo123'
        })
      });

      const result = await atProtoService.uploadImage(mockFile, caption, altText);
      
      // Verify the result
      expect(result).toEqual({ id: 'photo123' });
      
      // Verify the fetch call
      expect(mockFetch).toHaveBeenCalledTimes(1);
      
      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall[0]).toBe('http://localhost:3001/photos');
      expect(fetchCall[1].method).toBe('POST');
      expect(fetchCall[1].headers).toEqual({
        'Authorization': 'Bearer test-token'
      });
      expect(fetchCall[1].credentials).toBe('include');
      expect(fetchCall[1].mode).toBe('cors');
      
      // Verify FormData was created correctly
      const formData = fetchCall[1].body;
      expect(formData instanceof FormData).toBe(true);
      expect(formData.get('image')).toBe(mockFile);
      expect(formData.get('caption')).toBe(caption);
      expect(formData.get('altText')).toBe(altText);
    });

    // Test 2: Normal expected input - upload without alt text
    it('should upload an image successfully without alt text', async () => {
      // Create a mock file
      const mockFile = new File(['test image content'], 'test-image.jpg', { type: 'image/jpeg' });
      const caption = 'Test caption';
      
      // Mock successful upload response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'photo123'
        })
      });

      const result = await atProtoService.uploadImage(mockFile, caption);
      
      // Verify the result
      expect(result).toEqual({ id: 'photo123' });
      
      // Verify the fetch call
      const formData = mockFetch.mock.calls[0][1].body;
      expect(formData.get('image')).toBe(mockFile);
      expect(formData.get('caption')).toBe(caption);
      expect(formData.get('altText')).toBeNull();
    });

    // Test 3: Edge case - user not logged in
    it('should throw an error when user is not logged in', async () => {
      // Clear login state
      localStorage.clear();
      Object.defineProperty(atProtoService, 'token', { value: null });
      Object.defineProperty(atProtoService, 'user', { value: null });
      
      // Create a mock file
      const mockFile = new File(['test image content'], 'test-image.jpg', { type: 'image/jpeg' });
      const caption = 'Test caption';
      
      // Expect the upload to throw an error
      await expect(atProtoService.uploadImage(mockFile, caption)).rejects.toThrow('User must be logged in to upload images');
      
      // Verify fetch was not called
      expect(mockFetch).not.toHaveBeenCalled();
    });

    // Test 4: Invalid input - missing file
    it('should throw an error when file is missing', async () => {
      // Mock error response for missing file
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'Image file is required'
        })
      });

      // @ts-ignore - Testing invalid input
      const result = atProtoService.uploadImage(null, 'Test caption');
      
      // Expect the upload to fail
      await expect(result).rejects.toThrow();
    });

    // Test 5: Invalid input - missing caption
    it('should handle upload with missing caption', async () => {
      // Create a mock file
      const mockFile = new File(['test image content'], 'test-image.jpg', { type: 'image/jpeg' });
      
      // Mock error response for missing caption
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'Caption is required'
        })
      });

      // Attempt upload without caption
      const result = atProtoService.uploadImage(mockFile);
      
      // Expect the upload to fail with the server error
      await expect(result).rejects.toThrow('Caption is required');
    });

    // Test 6: Edge case - server error
    it('should handle server errors during upload', async () => {
      // Create a mock file
      const mockFile = new File(['test image content'], 'test-image.jpg', { type: 'image/jpeg' });
      const caption = 'Test caption';
      
      // Mock server error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'Internal server error'
        })
      });

      // Attempt upload
      const result = atProtoService.uploadImage(mockFile, caption);
      
      // Expect the upload to fail with the server error
      await expect(result).rejects.toThrow('Internal server error');
    });

    // Test 7: Edge case - network error
    it('should handle network errors during upload', async () => {
      // Create a mock file
      const mockFile = new File(['test image content'], 'test-image.jpg', { type: 'image/jpeg' });
      const caption = 'Test caption';
      
      // Mock network error
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      // Attempt upload
      const result = atProtoService.uploadImage(mockFile, caption);
      
      // Expect the upload to fail with a network error
      await expect(result).rejects.toThrow();
    });

    // Test 8: Edge case - large file
    it('should handle upload with a large file', async () => {
      // Create a mock large file (simulated)
      const mockLargeFile = new File(['test image content'.repeat(1000)], 'large-image.jpg', { type: 'image/jpeg' });
      const caption = 'Test caption';
      
      // Mock error response for file too large
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'File size exceeds the maximum limit of 5MB'
        })
      });

      // Attempt upload with large file
      const result = atProtoService.uploadImage(mockLargeFile, caption);
      
      // Expect the upload to fail with file size error
      await expect(result).rejects.toThrow('File size exceeds the maximum limit of 5MB');
    });

    // Test 9: Invalid input - unsupported file type
    it('should handle upload with unsupported file type', async () => {
      // Create a mock file with unsupported type
      const mockFile = new File(['test document content'], 'test-doc.txt', { type: 'text/plain' });
      const caption = 'Test caption';
      
      // Mock error response for invalid file type
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.'
        })
      });

      // Attempt upload with unsupported file type
      const result = atProtoService.uploadImage(mockFile, caption);
      
      // Expect the upload to fail with file type error
      await expect(result).rejects.toThrow('Invalid file type. Only JPEG, PNG, and WebP images are allowed.');
    });
  });
}); 