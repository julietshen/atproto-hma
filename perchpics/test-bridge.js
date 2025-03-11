/**
 * PerchPics Bridge Connection Test
 * 
 * Simple test file to verify connectivity with the ATProto-HMA bridge.
 * This helps ensure the bridge service is properly running and accessible.
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file in the same directory
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Debug: Print all environment variables 
console.log('Environment variables:');
Object.keys(process.env).filter(key => key.includes('HMA')).forEach(key => {
  console.log(`${key}: ${process.env[key]}`);
});

// Try to read env file directly
try {
  const envContent = fs.readFileSync(path.resolve(__dirname, '.env'), 'utf8');
  console.log('\nContent of .env file:');
  envContent.split('\n').filter(line => line.includes('HMA')).forEach(line => {
    console.log(line);
  });
} catch (error) {
  console.error('Error reading .env file:', error.message);
}

// IMPORTANT: Set hardcoded URL to ensure we're testing the right endpoint
// Uncomment and use this if environment variables aren't working
const BRIDGE_URL = 'http://localhost:3001'; // Hardcoded to port 3001
// const BRIDGE_URL = process.env.HMA_API_URL || 'http://localhost:3001'; 
const API_KEY = process.env.HMA_API_KEY || 'dev_key';

console.log('\nUsing BRIDGE_URL:', BRIDGE_URL);

/**
 * Test connection to the bridge service
 */
async function testBridgeConnection() {
  console.log(`\nTesting connection to bridge service at ${BRIDGE_URL}`);
  
  try {
    // Test the root endpoint
    console.log('Testing root endpoint...');
    const rootResponse = await fetch(BRIDGE_URL);
    console.log(`Root endpoint status: ${rootResponse.status}`);
    
    // Test the health endpoint
    console.log('Testing health endpoint...');
    const healthResponse = await fetch(`${BRIDGE_URL}/health`);
    console.log(`Health endpoint status: ${healthResponse.status}`);
    
    // Test the hash API endpoint with OPTIONS method (won't send actual data)
    console.log('Testing hash API endpoint...');
    const hashResponse = await fetch(`${BRIDGE_URL}/api/v1/hash`, {
      method: 'OPTIONS',
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      }
    });
    console.log(`Hash API endpoint status: ${hashResponse.status}`);
    console.log('Allowed methods:', hashResponse.headers.get('allow'));
    
    console.log('\nBridge connectivity test complete.');
    
    if (rootResponse.ok || healthResponse.ok) {
      console.log('\n✅ Bridge service appears to be accessible.');
    } else {
      console.log('\n❌ Unable to connect to bridge service. Please check if it is running.');
    }
  } catch (error) {
    console.error('\n❌ Error connecting to bridge service:', error.message);
    console.log('\nPlease ensure:');
    console.log('1. The bridge service is running on port 3001');
    console.log('2. HMA_API_URL in .env is set to http://localhost:3001');
    console.log('3. No firewall or network issues are blocking the connection');
  }
}

// Run the test
testBridgeConnection(); 