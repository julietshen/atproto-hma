import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import supertest from 'supertest';
import express from 'express';
import bodyParser from 'body-parser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

// Mock database
const mockDb = {
  run: vi.fn(),
  get: vi.fn(),
  all: vi.fn(),
  createUser: vi.fn(),
  getUserByUsername: vi.fn(),
  getUserByDid: vi.fn()
};

// Mock config
vi.mock('../../pds/config.js', () => ({
  pdsConfig: {
    auth: {
      secret: 'test-secret-key',
      tokenExpiration: '1h'
    }
  }
}));

// Import the auth module
import { setupAuthRoutes } from '../../pds/auth.js';

describe('Authentication API Endpoints', () => {
  let app: express.Application;
  let request: supertest.SuperTest<supertest.Test>;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Create a new Express app for each test
    app = express();
    app.use(bodyParser.json());
    
    // Set up auth routes
    setupAuthRoutes(app, mockDb);
    
    // Create supertest instance
    request = supertest(app);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    // Test 1: Normal expected input - successful registration
    it('should register a new user successfully', async () => {
      // Mock database functions
      mockDb.getUserByUsername.mockResolvedValueOnce(null); // User doesn't exist
      mockDb.createUser.mockResolvedValueOnce({
        id: 1,
        did: 'did:test:123',
        username: 'testuser'
      });
      
      // Mock bcrypt hash
      vi.spyOn(bcrypt, 'hash').mockImplementation(() => Promise.resolve('hashed_password'));
      
      // Mock jwt sign
      vi.spyOn(jwt, 'sign').mockImplementation(() => 'test-token');
      
      // Send registration request
      const response = await request
        .post('/auth/register')
        .send({
          username: 'testuser',
          password: 'password123'
        });
      
      // Verify response
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token', 'test-token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('did');
      expect(response.body.user).toHaveProperty('username', 'testuser');
      
      // Verify database calls
      expect(mockDb.getUserByUsername).toHaveBeenCalledWith('testuser');
      expect(mockDb.createUser).toHaveBeenCalledWith(
        expect.any(String), // DID
        'testuser',
        expect.any(String) // Hashed password
      );
    });

    // Test 2: Invalid input - missing username
    it('should return 400 when username is missing', async () => {
      const response = await request
        .post('/auth/register')
        .send({
          password: 'password123'
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Username and password are required');
    });

    // Test 3: Invalid input - missing password
    it('should return 400 when password is missing', async () => {
      const response = await request
        .post('/auth/register')
        .send({
          username: 'testuser'
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Username and password are required');
    });

    // Test 4: Edge case - username already exists
    it('should return 409 when username already exists', async () => {
      // Mock database functions
      mockDb.getUserByUsername.mockResolvedValueOnce({
        id: 1,
        did: 'did:test:123',
        username: 'testuser'
      });
      
      const response = await request
        .post('/auth/register')
        .send({
          username: 'testuser',
          password: 'password123'
        });
      
      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error', 'Username already exists');
    });

    // Test 5: Edge case - database error
    it('should handle database errors during registration', async () => {
      // Mock database error
      mockDb.getUserByUsername.mockRejectedValueOnce(new Error('Database error'));
      
      const response = await request
        .post('/auth/register')
        .send({
          username: 'testuser',
          password: 'password123'
        });
      
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /auth/login', () => {
    // Test 1: Normal expected input - successful login
    it('should log in a user successfully with valid credentials', async () => {
      // Mock database functions
      mockDb.getUserByUsername.mockResolvedValueOnce({
        id: 1,
        did: 'did:test:123',
        username: 'testuser',
        password: 'hashed_password'
      });
      
      // Mock bcrypt compare
      vi.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true));
      
      // Mock jwt sign
      vi.spyOn(jwt, 'sign').mockImplementation(() => 'test-token');
      
      // Send login request
      const response = await request
        .post('/auth/login')
        .send({
          username: 'testuser',
          password: 'password123'
        });
      
      // Verify response
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token', 'test-token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('did', 'did:test:123');
      expect(response.body.user).toHaveProperty('username', 'testuser');
      
      // Verify database calls
      expect(mockDb.getUserByUsername).toHaveBeenCalledWith('testuser');
    });

    // Test 2: Invalid input - missing username
    it('should return 400 when username is missing', async () => {
      const response = await request
        .post('/auth/login')
        .send({
          password: 'password123'
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Username and password are required');
    });

    // Test 3: Invalid input - missing password
    it('should return 400 when password is missing', async () => {
      const response = await request
        .post('/auth/login')
        .send({
          username: 'testuser'
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Username and password are required');
    });

    // Test 4: Invalid input - user not found
    it('should return 401 when user is not found', async () => {
      // Mock database functions
      mockDb.getUserByUsername.mockResolvedValueOnce(null);
      
      const response = await request
        .post('/auth/login')
        .send({
          username: 'nonexistentuser',
          password: 'password123'
        });
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    // Test 5: Invalid input - incorrect password
    it('should return 401 when password is incorrect', async () => {
      // Mock database functions
      mockDb.getUserByUsername.mockResolvedValueOnce({
        id: 1,
        did: 'did:test:123',
        username: 'testuser',
        password: 'hashed_password'
      });
      
      // Mock bcrypt compare
      vi.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false));
      
      const response = await request
        .post('/auth/login')
        .send({
          username: 'testuser',
          password: 'wrongpassword'
        });
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    // Test 6: Edge case - database error
    it('should handle database errors during login', async () => {
      // Mock database error
      mockDb.getUserByUsername.mockRejectedValueOnce(new Error('Database error'));
      
      const response = await request
        .post('/auth/login')
        .send({
          username: 'testuser',
          password: 'password123'
        });
      
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });
}); 