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
      let query = 'SELECT * FROM photos';
      const params = [];
      
      if (cursor) {
        query += ' WHERE created_at < ?';
        params.push(cursor);
      }
      
      query += ' ORDER BY created_at DESC LIMIT ?';
      params.push(limit);
      
      const photos = await db.all(query, params);
      
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
    
    // Blob methods
    getBlob: async (id) => {
      return db.get('SELECT * FROM blobs WHERE id = ?', [id]);
    },
    
    // Run raw SQL
    run: async (sql, params = []) => {
      return db.run(sql, params);
    },
    
    // Get all rows
    all: async (sql, params = []) => {
      return db.all(sql, params);
    },
    
    // Get moderation logs
    getModerationLogs: async (limit = 50, offset = 0) => {
      return db.all(
        'SELECT * FROM moderation_logs ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [limit, offset]
      );
    },
    
    // Get moderation logs for a specific photo
    getModerationLogsForPhoto: async (photoId) => {
      return db.all(
        'SELECT * FROM moderation_logs WHERE photo_id = ? ORDER BY created_at DESC',
        [photoId]
      );
    },
    
    // Get moderation stats
    getModerationStats: async () => {
      // Get overall stats
      const totalStats = await db.get(`
        SELECT
          COUNT(*) as total_photos,
          SUM(CASE WHEN hma_checked = 1 THEN 1 ELSE 0 END) as checked_photos,
          SUM(CASE WHEN hma_matched = 1 THEN 1 ELSE 0 END) as matched_photos
        FROM photos
      `);
      
      // Get stats by action type
      const actionStats = await db.all(`
        SELECT
          hma_action,
          COUNT(*) as count
        FROM photos
        WHERE hma_checked = 1
        GROUP BY hma_action
      `);
      
      // Get recently matched photos
      const recentMatches = await db.all(`
        SELECT
          p.id,
          p.author_did,
          p.caption,
          p.blob_id,
          p.created_at,
          p.hma_action,
          p.hma_checked_at
        FROM photos p
        WHERE p.hma_matched = 1
        ORDER BY p.hma_checked_at DESC
        LIMIT 10
      `);
      
      return {
        totalStats,
        actionStats,
        recentMatches
      };
    },
    
    // Raw database access
    exec: (sql, params) => db.exec(sql, params),
    get: (sql, params) => db.get(sql, params)
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
      hma_checked BOOLEAN DEFAULT 0,
      hma_matched BOOLEAN DEFAULT 0,
      hma_action TEXT,
      hma_checked_at TEXT,
      FOREIGN KEY (author_did) REFERENCES users(did)
    )
  `);
  
  // Ensure HMA columns exist (for backward compatibility)
  try {
    // Check if columns exist
    const tableInfo = await db.all("PRAGMA table_info(photos)");
    const columns = tableInfo.map(col => col.name);
    
    // Add missing columns if needed
    if (!columns.includes('hma_checked')) {
      await db.exec('ALTER TABLE photos ADD COLUMN hma_checked BOOLEAN DEFAULT 0');
    }
    if (!columns.includes('hma_matched')) {
      await db.exec('ALTER TABLE photos ADD COLUMN hma_matched BOOLEAN DEFAULT 0');
    }
    if (!columns.includes('hma_action')) {
      await db.exec('ALTER TABLE photos ADD COLUMN hma_action TEXT');
    }
    if (!columns.includes('hma_checked_at')) {
      await db.exec('ALTER TABLE photos ADD COLUMN hma_checked_at TEXT');
    }
  } catch (error) {
    console.error('Error ensuring HMA columns exist:', error);
  }
  
  // Photo tags table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS photo_tags (
      photo_id TEXT NOT NULL,
      tag TEXT NOT NULL,
      FOREIGN KEY (photo_id) REFERENCES photos(id)
    )
  `);
  
  // Blobs table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS blobs (
      id TEXT PRIMARY KEY,
      data BLOB NOT NULL,
      content_type TEXT NOT NULL,
      size INTEGER NOT NULL
    )
  `);
  
  // Moderation logs table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS moderation_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      photo_id TEXT NOT NULL,
      action TEXT NOT NULL,
      reason TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (photo_id) REFERENCES photos(id)
    )
  `);
}