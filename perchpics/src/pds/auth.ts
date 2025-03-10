/**
 * PerchPics PDS Authentication
 * 
 * This file implements authentication routes for the PerchPics PDS.
 * It handles user registration, login, and token validation.
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { Request, Response, NextFunction, Express, RequestHandler } from 'express';
import { pdsConfig } from './config.js';
import { PDSDB } from './database.js';

// User interface
interface User {
  username: string;
  did: string;
}

// JWT payload interface
interface TokenPayload {
  username: string;
  did: string;
  iat?: number;
  exp?: number;
}

// Request with user property
interface AuthRequest extends Request {
  user?: any;
}

// Setup authentication routes
export function setupAuthRoutes(app: Express, db: PDSDB): void {
  // Register a new user
  app.post('/auth/register', (async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      
      // Validate input
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }
      
      // Check if username already exists
      const existingUser = await db.getUserByUsername(username);
      if (existingUser) {
        return res.status(409).json({ error: 'Username already exists' });
      }
      
      // Generate a DID for the user
      const did = generateDid();
      
      // Hash the password
      const passwordHash = await bcrypt.hash(password, 10);
      
      // Create the user
      await db.createUser(username, passwordHash, did);
      
      // Generate a token
      const token = generateToken({ username, did });
      
      // Return the token and user info
      res.status(201).json({
        token,
        user: {
          username,
          did
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Failed to register user' });
    }
  }) as RequestHandler);
  
  // Login an existing user
  app.post('/auth/login', (async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      
      // Validate input
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }
      
      // Get the user
      const user = await db.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      // Verify the password
      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      // Generate a token
      const token = generateToken({ username: user.username, did: user.did });
      
      // Return the token and user info
      res.json({
        token,
        user: {
          username: user.username,
          did: user.did
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Failed to login' });
    }
  }) as RequestHandler);
  
  // Get the current user
  app.get('/auth/me', authenticateToken, (async (req: AuthRequest, res: Response) => {
    try {
      const { did } = req.user;
      
      // Get the user
      const user = await db.getUserByDid(did);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Return the user info
      res.json({
        user: {
          username: user.username,
          did: user.did
        }
      });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Failed to get user' });
    }
  }) as RequestHandler);
}

// Generate a DID (Decentralized Identifier)
function generateDid(): string {
  const randomBytes = crypto.randomBytes(16).toString('hex');
  return `did:perchpics:${randomBytes}`;
}

// Generate a JWT token
function generateToken(payload: any): string {
  return jwt.sign(payload, pdsConfig.auth.secret, {
    expiresIn: pdsConfig.auth.tokenExpiration
  });
}

// Middleware to authenticate JWT tokens
export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  
  jwt.verify(token, pdsConfig.auth.secret, (err, user) => {
    if (err) {
      res.status(403).json({ error: 'Invalid or expired token' });
      return;
    }
    
    req.user = user;
    next();
  });
} 