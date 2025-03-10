/**
 * PerchPics PDS Database
 * 
 * This file implements the database layer for the PerchPics PDS.
 * It handles creating and managing the SQLite database.
 */

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { pdsConfig } from './config.js';
import bcrypt from 'bcrypt';

// Create and initialize the database
export async function createDatabase() {
  // Open the database
  const db = await open({
    filename: pdsConfig.db.location,
    driver: sqlite3.Database
  });
  
  // Enable foreign keys
  await db.exec('PRAGMA foreign_keys = ON');
  
  // Create tables if they don't exist
  await createTables(db);
  
  // Create demo user if it doesn't exist
  await createDemoUser(db);
  
  // Return the database interface
  return {
    // User methods
    createUser: async (username, passwordHash, did) => {
      return db.run(
        'INSERT INTO users (username, password_hash, did, created_at) VALUES (?, ?, ?, ?)',
        [username, passwordHash, did, new Date().toISOString()]
      );
    },
    
    getUserByUsername: async (username) => {
      return db.get('SELECT * FROM users WHERE username = ?', [username]);
    },
    
    getUserByDid: async (did) => {
      return db.get('SELECT * FROM users WHERE did = ?', [did]);
    },
    
    // Photo methods
    createPhoto: async (did, photoData) => {
      const { caption, altText, location, tags, blobId, createdAt } = photoData;
      const photoId = `${did}/app.perchpics.photo/${Date.now()}`;
      
      await db.run(
        'INSERT INTO photos (id, author_did, caption, alt_text, location, blob_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [photoId, did, caption, altText, location, blobId, createdAt || new Date().toISOString()]
      );
      
      // Insert tags if provided
      if (tags && Array.isArray(tags)) {
        for (const tag of tags) {
          await db.run(
            'INSERT INTO photo_tags (photo_id, tag) VALUES (?, ?)',
            [photoId, tag]
          );
        }
      }
      
      return { id: photoId };
    },
    
    getPhotoById: async (photoId) => {
      const photo = await db.get('SELECT * FROM photos WHERE id = ?', [photoId]);
      
      if (!photo) return null;
      
      // Get tags for the photo
      const tags = await db.all(
        'SELECT tag FROM photo_tags WHERE photo_id = ?',
        [photoId]
      );
      
      return {
        ...photo,
        tags: tags.map(t => t.tag)
      };
    },
    
    getPhotosByUser: async (did) => {
      const photos = await db.all(
        'SELECT * FROM photos WHERE author_did = ? ORDER BY created_at DESC',
        [did]
      );
      
      // Get tags for each photo
      for (const photo of photos) {
        const tags = await db.all(
          'SELECT tag FROM photo_tags WHERE photo_id = ?',
          [photo.id]
        );
        
        photo.tags = tags.map(t => t.tag);
      }
      
      return photos;
    },
    
    getAllPhotos: async (limit = 50, cursor) => {
      try {
        console.log(`Database - getAllPhotos called with limit: ${limit}, cursor: ${cursor || 'none'}`);
        
        let query = 'SELECT p.*, u.username FROM photos p JOIN users u ON p.author_did = u.did';
        const params = [];
        
        if (cursor) {
          query += ' WHERE p.created_at < ?';
          params.push(cursor);
        }
        
        query += ' ORDER BY p.created_at DESC LIMIT ?';
        params.push(limit);
        
        console.log(`Database - Executing query: ${query} with params:`, params);
        
        const photos = await db.all(query, params);
        console.log(`Database - Found ${photos.length} photos`);
        
        // Get tags for each photo
        for (const photo of photos) {
          const tags = await db.all(
            'SELECT tag FROM photo_tags WHERE photo_id = ?',
            [photo.id]
          );
          
          photo.tags = tags.map(t => t.tag);
        }
        
        return photos;
      } catch (error) {
        console.error('Database error in getAllPhotos:', error);
        throw error; // Re-throw to allow proper error handling upstream
      }
    },
    
    // Raw database access
    exec: (sql, params) => db.exec(sql, params),
    get: (sql, params) => db.get(sql, params),
    all: (sql, params) => db.all(sql, params),
    run: (sql, params) => db.run(sql, params)
  };
}

// Create database tables
async function createTables(db) {
  // Users table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      username TEXT PRIMARY KEY,
      password_hash TEXT NOT NULL,
      did TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL
    )
  `);
  
  // Photos table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS photos (
      id TEXT PRIMARY KEY,
      author_did TEXT NOT NULL,
      caption TEXT NOT NULL,
      alt_text TEXT,
      location TEXT,
      blob_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (author_did) REFERENCES users(did)
    )
  `);
  
  // Photo tags table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS photo_tags (
      photo_id TEXT NOT NULL,
      tag TEXT NOT NULL,
      PRIMARY KEY (photo_id, tag),
      FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE
    )
  `);
  
  // Blobs table to track uploaded files
  await db.exec(`
    CREATE TABLE IF NOT EXISTS blobs (
      id TEXT PRIMARY KEY,
      size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);
}

// Create a demo user if it doesn't exist
async function createDemoUser(db) {
  try {
    // Check if demo user already exists
    const existingUser = await db.get('SELECT * FROM users WHERE username = ?', ['demo']);
    
    if (!existingUser) {
      console.log('Creating demo user...');
      
      // Generate a DID for the demo user
      const did = 'did:perchpics:demo';
      
      // Hash the password
      const passwordHash = await bcrypt.hash('perchpics123', 10);
      
      // Create the demo user
      await db.run(
        'INSERT INTO users (username, password_hash, did, created_at) VALUES (?, ?, ?, ?)',
        ['demo', passwordHash, did, new Date().toISOString()]
      );
      
      console.log('Demo user created successfully!');
    }
  } catch (error) {
    console.error('Error creating demo user:', error);
  }
} 