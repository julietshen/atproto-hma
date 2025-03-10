import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import supertest from 'supertest';
import express from 'express';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';

// Mock multer
vi.mock('multer', () => {
  const multerMock = () => ({
    single: () => (req: any, res: any, next: any) => {
      // Simulate file upload
      if (req.body.simulateFileError) {
        return next(new Error('File upload error'));
      }
      
      if (req.body.simulateMissingFile) {
        return next();
      }
      
      req.file = {
        filename: 'test-image.jpg',
        path: '/tmp/test-image.jpg',
        size: 1024,
        mimetype: 'image/jpeg'
      };
      next();
    }
  });
  
  // Add diskStorage method
  multerMock.diskStorage = vi.fn().mockImplementation((options) => ({
    _handleFile: (req: any, file: any, cb: any) => {
      cb(null, {
        path: path.join(options.destination(req, file, (e: any, p: string) => p), 
                        options.filename(req, file, (e: any, f: string) => f)),
        size: 1024
      });
    }
  }));
  
  return {
    default: multerMock
  };
});

// Mock fs
vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(true),
  mkdirSync: vi.fn(),
  promises: {
    unlink: vi.fn().mockResolvedValue(undefined)
  }
}));

// Mock config
vi.mock('../../pds/config.js', () => ({
  pdsConfig: {
    storage: {
      directory: '/tmp/blobs',
      maxSize: 5 * 1024 * 1024,
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
    },
    auth: {
      secret: 'test-secret-key',
      tokenExpiration: '1h'
    }
  }
}));

// Mock database
const mockDb = {
  run: vi.fn(),
  get: vi.fn(),
  all: vi.fn(),
  createPhoto: vi.fn(),
  getUserByDid: vi.fn()
};

// Mock authenticateToken middleware
vi.mock('../../pds/auth.js', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    if (req.headers.authorization === 'Bearer invalid-token') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    if (req.headers.authorization === 'Bearer expired-token') {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    req.user = {
      did: 'did:test:123',
      username: 'testuser'
    };
    next();
  }
}));

// Import the photos module
import { setupPhotoRoutes } from '../../pds/photos.js';

describe('Photo API Endpoints', () => {
  let app: express.Application;
  let request: supertest.SuperTest<supertest.Test>;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Create a new Express app for each test
    app = express();
    app.use(express.json());
    
    // Set up photo routes
    setupPhotoRoutes(app, mockDb);
    
    // Create supertest instance
    request = supertest(app);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /photos', () => {
    // Test 1: Normal expected input - successful upload
    it('should upload a photo successfully with valid inputs', async () => {
      // Mock database functions
      mockDb.createPhoto.mockResolvedValueOnce({
        id: 'photo123',
        caption: 'Test caption',
        altText: 'Test alt text',
        blobId: 'test-image.jpg'
      });
      
      // Send upload request
      const response = await request
        .post('/photos')
        .set('Authorization', 'Bearer valid-token')
        .field('caption', 'Test caption')
        .field('altText', 'Test alt text')
        .attach('image', Buffer.from('test image content'), 'test-image.jpg');
      
      // Verify response
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id', 'photo123');
      
      // Verify database calls
      expect(mockDb.createPhoto).toHaveBeenCalledWith(
        'did:test:123',
        expect.objectContaining({
          caption: 'Test caption',
          altText: 'Test alt text',
          blobId: expect.any(String)
        })
      );
    });

    // Test 2: Normal expected input - upload without alt text
    it('should upload a photo successfully without alt text', async () => {
      // Mock database functions
      mockDb.createPhoto.mockResolvedValueOnce({
        id: 'photo123',
        caption: 'Test caption',
        blobId: 'test-image.jpg'
      });
      
      // Send upload request
      const response = await request
        .post('/photos')
        .set('Authorization', 'Bearer valid-token')
        .field('caption', 'Test caption')
        .attach('image', Buffer.from('test image content'), 'test-image.jpg');
      
      // Verify response
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id', 'photo123');
      
      // Verify database calls
      expect(mockDb.createPhoto).toHaveBeenCalledWith(
        'did:test:123',
        expect.objectContaining({
          caption: 'Test caption',
          altText: null,
          blobId: expect.any(String)
        })
      );
    });

    // Test 3: Invalid input - missing authentication
    it('should return 401 when authentication is missing', async () => {
      const response = await request
        .post('/photos')
        .field('caption', 'Test caption')
        .attach('image', Buffer.from('test image content'), 'test-image.jpg');
      
      expect(response.status).toBe(401);
    });

    // Test 4: Invalid input - invalid token
    it('should return 401 when token is invalid', async () => {
      const response = await request
        .post('/photos')
        .set('Authorization', 'Bearer invalid-token')
        .field('caption', 'Test caption')
        .attach('image', Buffer.from('test image content'), 'test-image.jpg');
      
      expect(response.status).toBe(401);
    });

    // Test 5: Invalid input - expired token
    it('should return 401 when token is expired', async () => {
      const response = await request
        .post('/photos')
        .set('Authorization', 'Bearer expired-token')
        .field('caption', 'Test caption')
        .attach('image', Buffer.from('test image content'), 'test-image.jpg');
      
      expect(response.status).toBe(401);
    });

    // Test 6: Invalid input - missing image
    it('should return 400 when image is missing', async () => {
      // Send upload request with missing file
      const response = await request
        .post('/photos')
        .set('Authorization', 'Bearer valid-token')
        .field('caption', 'Test caption')
        .field('simulateMissingFile', 'true');
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Image file is required');
    });

    // Test 7: Invalid input - missing caption
    it('should return 400 when caption is missing', async () => {
      // Send upload request without caption
      const response = await request
        .post('/photos')
        .set('Authorization', 'Bearer valid-token')
        .attach('image', Buffer.from('test image content'), 'test-image.jpg');
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Caption is required');
    });

    // Test 8: Edge case - file upload error
    it('should handle file upload errors', async () => {
      // Send upload request with simulated file error
      const response = await request
        .post('/photos')
        .set('Authorization', 'Bearer valid-token')
        .field('caption', 'Test caption')
        .field('simulateFileError', 'true')
        .attach('image', Buffer.from('test image content'), 'test-image.jpg');
      
      expect(response.status).toBe(500);
    });

    // Test 9: Edge case - database error
    it('should handle database errors during upload', async () => {
      // Mock database error
      mockDb.createPhoto.mockRejectedValueOnce(new Error('Database error'));
      
      // Send upload request
      const response = await request
        .post('/photos')
        .set('Authorization', 'Bearer valid-token')
        .field('caption', 'Test caption')
        .attach('image', Buffer.from('test image content'), 'test-image.jpg');
      
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /photos/:id', () => {
    // Test 1: Normal expected input - successful retrieval
    it('should retrieve a photo successfully with valid ID', async () => {
      // Mock database functions
      mockDb.get.mockResolvedValueOnce({
        id: 'photo123',
        user_did: 'did:test:123',
        caption: 'Test caption',
        alt_text: 'Test alt text',
        blob_id: 'test-image.jpg',
        created_at: '2023-01-01T00:00:00.000Z'
      });
      
      // Send retrieval request
      const response = await request
        .get('/photos/photo123')
        .set('Authorization', 'Bearer valid-token');
      
      // Verify response
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', 'photo123');
      expect(response.body).toHaveProperty('caption', 'Test caption');
      expect(response.body).toHaveProperty('altText', 'Test alt text');
      expect(response.body).toHaveProperty('blobId', 'test-image.jpg');
      expect(response.body).toHaveProperty('createdAt', '2023-01-01T00:00:00.000Z');
      
      // Verify database calls
      expect(mockDb.get).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM photos WHERE id = ?'),
        ['photo123']
      );
    });

    // Test 2: Invalid input - photo not found
    it('should return 404 when photo is not found', async () => {
      // Mock database functions
      mockDb.get.mockResolvedValueOnce(null);
      
      // Send retrieval request
      const response = await request
        .get('/photos/nonexistent')
        .set('Authorization', 'Bearer valid-token');
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Photo not found');
    });

    // Test 3: Edge case - database error
    it('should handle database errors during retrieval', async () => {
      // Mock database error
      mockDb.get.mockRejectedValueOnce(new Error('Database error'));
      
      // Send retrieval request
      const response = await request
        .get('/photos/photo123')
        .set('Authorization', 'Bearer valid-token');
      
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });
}); 