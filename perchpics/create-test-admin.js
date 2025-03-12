/**
 * Create Test Admin User Script
 * 
 * This script creates a new test admin user for frontend testing.
 */

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function createTestAdmin() {
  // Open the database
  const db = await open({
    filename: join(__dirname, './data/perchpics.db'),
    driver: sqlite3.Database
  });
  
  try {
    // Default admin credentials - CHANGE THESE IN PRODUCTION
    const username = process.env.ADMIN_USERNAME || 'admin';
    const password = process.env.ADMIN_PASSWORD || 'change-this-password-in-production';
    
    // Check if the test admin user already exists
    const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    
    if (user) {
      console.log(`Admin user '${username}' already exists. Updating password...`);
      
      // Hash the password
      const passwordHash = await bcrypt.hash(password, 10);
      
      // Update the admin password
      await db.run('UPDATE users SET password_hash = ? WHERE username = ?', [passwordHash, username]);
      console.log(`Password updated successfully.`);
      console.log('WARNING: Use a secure password in production environments!');
    } else {
      console.log(`Creating new admin user '${username}'...`);
      
      // Hash the password
      const passwordHash = await bcrypt.hash(password, 10);
      
      // Create a DID for the admin user
      const did = `did:plc:${Buffer.from(crypto.randomBytes(16)).toString('hex')}`;
      
      // Create the admin user
      await db.run(
        'INSERT INTO users (username, password_hash, did, created_at) VALUES (?, ?, ?, ?)',
        [username, passwordHash, did, new Date().toISOString()]
      );
      
      console.log('Admin user created successfully:');
      console.log(`  Username: ${username}`);
      console.log('  Password: [MASKED] - Check environment variables or script defaults');
      console.log(`  DID: ${did}`);
      console.log('WARNING: Use a secure password in production environments!');
    }
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await db.close();
  }
}

// Run the script
createTestAdmin().catch(console.error); 