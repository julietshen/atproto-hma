/**
 * PerchPics HMA and Bridge Test Script
 * 
 * This script tests connections to both:
 * 1. The HMA Service directly (port 5000)
 * 2. The ATProto-HMA Bridge (port 3001)
 */

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
import FormData from 'form-data';

// Configuration from environment or defaults
const HMA_SERVICE_URL = process.env.HMA_SERVICE_URL || 'http://localhost:5000';
const BRIDGE_API_URL = process.env.HMA_API_URL || 'http://localhost:3001';
const API_KEY = process.env.HMA_API_KEY || 'dev_key';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

/**
 * Log a message with a timestamp
 */
function log(message) {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
  console.log(`${colors.gray}[${timestamp}]${colors.reset} ${message}`);
}

/**
 * Test HMA Service health endpoints
 */
async function testHMAHealth() {
  console.log('\n----- Testing HMA Service Health -----');
  
  // Try multiple potential health endpoints
  const endpoints = ['/health', '/api/v1/health', '/'];
  
  for (const endpoint of endpoints) {
    const url = `${HMA_SERVICE_URL}${endpoint}`;
    try {
      console.log(`Testing endpoint: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        timeout: 3000
      });
      
      console.log(`Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        try {
          const data = await response.json();
          console.log('Response data:', data);
        } catch (e) {
          const text = await response.text();
          console.log('Response text:', text.substring(0, 100) + (text.length > 100 ? '...' : ''));
        }
        console.log(`✅ HMA Service endpoint ${endpoint} is working!`);
        return true;
      }
    } catch (error) {
      console.error(`Error testing ${endpoint}:`, error.message);
    }
  }
  
  console.error('❌ All HMA Service health endpoints failed');
  return false;
}

/**
 * Test Bridge health endpoint
 */
async function testBridgeHealth() {
  console.log('\n----- Testing ATProto-HMA Bridge Health -----');
  log(`Using bridge URL: ${BRIDGE_API_URL}`);
  
  // Try multiple potential health endpoints
  const endpoints = ['/health', '/api/v1/health', '/'];
  
  for (const endpoint of endpoints) {
    const url = `${BRIDGE_API_URL}${endpoint}`;
    try {
      console.log(`Testing endpoint: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${API_KEY}`
        }
      });
      
      console.log(`Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        try {
          const data = await response.json();
          console.log('Response data:', data);
        } catch (e) {
          const text = await response.text();
          console.log('Response text:', text.substring(0, 100) + (text.length > 100 ? '...' : ''));
        }
        console.log(`${colors.green}✅ Bridge endpoint ${endpoint} is working!${colors.reset}`);
        return true;
      }
    } catch (error) {
      console.error(`Error testing ${endpoint}:`, error.message);
    }
  }
  
  console.error(`${colors.red}❌ All bridge health endpoints failed${colors.reset}`);
  return false;
}

/**
 * Test bridge hash API
 */
async function testBridgeHashAPI() {
  console.log('\n----- Testing ATProto-HMA Bridge Hash API -----');
  
  // The bridge should expose these endpoints - updated for HMA 2.0
  const hashEndpoints = [
    '/api/v1/hash',
    '/api/v1/hash/url',
  ];
  
  for (const endpoint of hashEndpoints) {
    const url = `${BRIDGE_API_URL}${endpoint}`;
    try {
      console.log(`Testing endpoint: ${url}`);
      
      // Send a simple request - this will likely fail but will tell us if the endpoint exists
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          test: true,
          author_did: 'did:plc:test',
          photo_id: 'test-photo'
        })
      });
      
      console.log(`Status: ${response.status} ${response.statusText}`);
      
      // Even a 400 Bad Request is OK here - it means the endpoint exists
      // but we're not sending the correct data
      if (response.status !== 404) {
        try {
          const data = await response.json();
          console.log('Response data:', data);
        } catch (e) {
          const text = await response.text();
          console.log('Response text:', text.substring(0, 100) + (text.length > 100 ? '...' : ''));
        }
        console.log(`${colors.green}✅ Hash endpoint ${endpoint} exists${colors.reset}`);
        return true;
      }
    } catch (error) {
      console.error(`Error testing ${endpoint}:`, error.message);
    }
  }
  
  console.error(`${colors.red}❌ Could not find a working hash endpoint on the bridge${colors.reset}`);
  return false;
}

/**
 * Test if the bridge can access the HMA API
 */
async function testBridgeToHMA() {
  console.log('\n----- Testing Bridge Connection to HMA -----');
  
  const testEndpoint = '/api/v1/hash';
  const url = `${BRIDGE_API_URL}${testEndpoint}`;
  
  try {
    console.log(`Testing if bridge can access HMA via ${url}`);
    
    // Create a manual timeout promise 
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timed out')), 5000);
    });
    
    // Race the fetch against the timeout
    const response = await Promise.race([
      fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          author_did: 'did:plc:test',
          photo_id: 'test-image',
          // Include a tiny, valid base64 encoded 1x1 transparent PNG
          image_data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
        })
      }),
      timeoutPromise
    ]);
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    let data;
    try {
      data = await response.json();
      console.log('Response data:', data);
    } catch (e) {
      const text = await response.text();
      console.log('Response text:', text.substring(0, 100) + (text.length > 100 ? '...' : ''));
      return false;
    }
    
    if (response.ok) {
      console.log(`${colors.green}✅ Bridge successfully communicated with HMA service!${colors.reset}`);
      return true;
    } else {
      console.log(`${colors.yellow}⚠️ Bridge responded but may have issues communicating with HMA${colors.reset}`);
      return false;
    }
  } catch (error) {
    if (error.message === 'Request timed out') {
      console.error(`${colors.red}❌ Request timed out - the bridge might not be able to reach the HMA service${colors.reset}`);
    } else {
      console.error(`${colors.red}❌ Error:${colors.reset}`, error.message);
    }
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('===== PerchPics HMA & Bridge Test Script =====');
  console.log(`HMA Service URL: ${HMA_SERVICE_URL}`);
  console.log(`Bridge API URL: ${BRIDGE_API_URL}`);
  
  // Test HMA Service health
  const hmaHealthOk = await testHMAHealth();
  
  if (!hmaHealthOk) {
    console.log('\n⚠️ HMA Service health check failed. The service may be unavailable.');
  }
  
  // Test Bridge health
  const bridgeHealthOk = await testBridgeHealth();
  
  if (!bridgeHealthOk) {
    console.log('\n⚠️ ATProto-HMA Bridge health check failed, but continuing tests...');
  }
  
  // Test hash API
  const hashApiOk = await testBridgeHashAPI();
  
  if (!hashApiOk) {
    console.log('\n⚠️ ATProto-HMA Bridge hash API could not be found or is not working.');
  }
  
  // Test bridge to HMA connection
  const hmaConnectionOk = await testBridgeToHMA();
  
  if (!hmaConnectionOk) {
    console.log('\n⚠️ Bridge to HMA connection failed.');
  }
  
  // Overall result
  console.log('\n===== Test Results =====');
  
  console.log(`HMA Service: ${hmaHealthOk ? '✅ Available' : '❌ Unavailable'}`);
  console.log(`ATProto-HMA Bridge: ${bridgeHealthOk ? '✅ Available' : '❌ Unavailable'}`);
  console.log(`Hash API: ${hashApiOk ? '✅ Available' : '❌ Unavailable'}`);
  console.log(`Bridge to HMA connection: ${hmaConnectionOk ? '✅ Available' : '❌ Unavailable'}`);
  
  if (!bridgeHealthOk || !hashApiOk || !hmaConnectionOk) {
    console.log('\n⚠️ There are issues with the ATProto-HMA Bridge:');
    console.log('1. Check that the bridge service is running: docker ps | grep atproto-hma');
    console.log('2. Examine bridge service logs: docker logs atproto-hma-atproto-hma-1');
    console.log('3. Verify database connection settings in the bridge service');
  }
  
  if (!hmaHealthOk) {
    console.log('\n⚠️ There are issues with the HMA Service:');
    console.log('1. Check that the HMA service is running: docker ps | grep hma-app');
    console.log('2. Examine HMA service logs: docker logs atproto-hma-app-1');
  }
  
  console.log('\nFor PerchPics to work correctly:');
  console.log('1. Set HMA_API_URL=http://localhost:3001 in your .env file');
  console.log('2. Make sure the ATProto-HMA Bridge can connect to the database');
}

// Run the main function
main().catch(error => {
  console.error('Test script failed:', error);
  process.exit(1);
}); 