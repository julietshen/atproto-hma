/**
 * PerchPics HMA Integration Test Suite
 * 
 * This script provides comprehensive testing for the HMA integration:
 * 1. Tests connection to the HMA Service directly (port 5000)
 * 2. Tests connection to the ATProto-HMA Bridge (port 3001)
 * 3. Tests image matching functionality against the HMA database
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Get the current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Configuration from environment or defaults
const HMA_SERVICE_URL = process.env.HMA_SERVICE_URL || 'http://localhost:5000';
const BRIDGE_API_URL = 'http://localhost:3001';
const API_KEY = process.env.HMA_API_KEY || 'replace-with-your-api-key';
const DEMO_IMAGES_PATH = path.resolve(__dirname, '../demo_images');

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

// Debug: Print environment variables related to HMA
console.log('Environment variables:');
Object.keys(process.env).filter(key => key.includes('HMA')).forEach(key => {
  console.log(`${key}: ${process.env[key]}`);
});

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
      log(`Testing endpoint: ${url}`);
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        log(`${colors.green}✓ Success:${colors.reset} ${url} - ${JSON.stringify(data)}`);
        return true;
      } else {
        log(`${colors.yellow}⚠ Warning:${colors.reset} ${url} - ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      log(`${colors.red}✗ Error:${colors.reset} ${url} - ${error.message}`);
    }
  }
  
  log(`${colors.yellow}⚠ Warning:${colors.reset} No health endpoints responded successfully`);
  return false;
}

/**
 * Test Bridge Service health endpoint
 */
async function testBridgeHealth() {
  console.log('\n----- Testing Bridge Service Health -----');
  
  const url = `${BRIDGE_API_URL}/health`;
  try {
    log(`Testing endpoint: ${url}`);
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      const data = await response.json();
      log(`${colors.green}✓ Success:${colors.reset} ${url} - ${JSON.stringify(data)}`);
      return true;
    } else {
      log(`${colors.yellow}⚠ Warning:${colors.reset} ${url} - ${response.status} ${response.statusText}`);
      return false;
    }
  } catch (error) {
    log(`${colors.red}✗ Error:${colors.reset} ${url} - ${error.message}`);
    return false;
  }
}

/**
 * Test Bridge API endpoints
 */
async function testBridgeAPI() {
  console.log('\n----- Testing Bridge API Endpoints -----');
  
  const endpoints = [
    { url: '/api/v1/banks', method: 'GET', name: 'List Banks' },
    { url: '/api/v1/status', method: 'GET', name: 'Service Status' }
  ];
  
  for (const endpoint of endpoints) {
    const url = `${BRIDGE_API_URL}${endpoint.url}`;
    try {
      log(`Testing ${endpoint.name}: ${url}`);
      const response = await fetch(url, {
        method: endpoint.method,
        headers: { 
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        log(`${colors.green}✓ Success:${colors.reset} ${endpoint.name} - ${JSON.stringify(data).substring(0, 100)}...`);
      } else {
        log(`${colors.yellow}⚠ Warning:${colors.reset} ${endpoint.name} - ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      log(`${colors.red}✗ Error:${colors.reset} ${endpoint.name} - ${error.message}`);
    }
  }
}

/**
 * Test image hashing via the Bridge
 */
async function testImageHashing() {
  console.log('\n----- Testing Image Hashing -----');
  
  // Find a sample image
  let sampleImagePath;
  try {
    const files = fs.readdirSync(DEMO_IMAGES_PATH);
    const imageFiles = files.filter(file => 
      file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.png')
    );
    
    if (imageFiles.length === 0) {
      log(`${colors.red}✗ Error:${colors.reset} No sample images found in ${DEMO_IMAGES_PATH}`);
      return;
    }
    
    sampleImagePath = path.join(DEMO_IMAGES_PATH, imageFiles[0]);
    log(`Using sample image: ${sampleImagePath}`);
  } catch (error) {
    log(`${colors.red}✗ Error:${colors.reset} Failed to find sample images: ${error.message}`);
    log(`${colors.yellow}⚠ Warning:${colors.reset} Using fallback test image path`);
    sampleImagePath = path.join(__dirname, 'public', 'sample.jpg');
  }
  
  // Check if the image exists
  if (!fs.existsSync(sampleImagePath)) {
    log(`${colors.red}✗ Error:${colors.reset} Sample image not found: ${sampleImagePath}`);
    return;
  }
  
  // Create form data with the image
  const form = new FormData();
  form.append('image', fs.createReadStream(sampleImagePath));
  
  // Test hashing endpoint
  const url = `${BRIDGE_API_URL}/api/v1/hash`;
  try {
    log(`Testing hash endpoint: ${url}`);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-API-Key': API_KEY,
        ...form.getHeaders()
      },
      body: form
    });
    
    if (response.ok) {
      const data = await response.json();
      log(`${colors.green}✓ Success:${colors.reset} Image hashed successfully`);
      log(`Hash result: ${JSON.stringify(data).substring(0, 100)}...`);
      return data;
    } else {
      log(`${colors.yellow}⚠ Warning:${colors.reset} Hash failed - ${response.status} ${response.statusText}`);
      return null;
    }
  } catch (error) {
    log(`${colors.red}✗ Error:${colors.reset} Hash request failed - ${error.message}`);
    return null;
  }
}

/**
 * Test image matching via the Bridge
 */
async function testImageMatching() {
  console.log('\n----- Testing Image Matching -----');
  
  // Find a sample image
  let sampleImagePath;
  try {
    const files = fs.readdirSync(DEMO_IMAGES_PATH);
    const imageFiles = files.filter(file => 
      file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.png')
    );
    
    if (imageFiles.length === 0) {
      log(`${colors.red}✗ Error:${colors.reset} No sample images found in ${DEMO_IMAGES_PATH}`);
      return;
    }
    
    sampleImagePath = path.join(DEMO_IMAGES_PATH, imageFiles[0]);
    log(`Using sample image: ${sampleImagePath}`);
  } catch (error) {
    log(`${colors.red}✗ Error:${colors.reset} Failed to find sample images: ${error.message}`);
    log(`${colors.yellow}⚠ Warning:${colors.reset} Using fallback test image path`);
    sampleImagePath = path.join(__dirname, 'public', 'sample.jpg');
  }
  
  // Check if the image exists
  if (!fs.existsSync(sampleImagePath)) {
    log(`${colors.red}✗ Error:${colors.reset} Sample image not found: ${sampleImagePath}`);
    return;
  }
  
  // Create form data with the image
  const form = new FormData();
  form.append('image', fs.createReadStream(sampleImagePath));
  form.append('threshold', '0.8');
  
  // Test matching endpoint
  const url = `${BRIDGE_API_URL}/api/v1/match`;
  try {
    log(`Testing match endpoint: ${url}`);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-API-Key': API_KEY,
        ...form.getHeaders()
      },
      body: form
    });
    
    if (response.ok) {
      const data = await response.json();
      log(`${colors.green}✓ Success:${colors.reset} Image match check completed`);
      log(`Match result: ${JSON.stringify(data).substring(0, 100)}...`);
      
      if (data.matches && data.matches.length > 0) {
        log(`${colors.green}Found ${data.matches.length} matches!${colors.reset}`);
      } else {
        log(`${colors.yellow}No matches found${colors.reset}`);
      }
      
      return data;
    } else {
      log(`${colors.yellow}⚠ Warning:${colors.reset} Match failed - ${response.status} ${response.statusText}`);
      return null;
    }
  } catch (error) {
    log(`${colors.red}✗ Error:${colors.reset} Match request failed - ${error.message}`);
    return null;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log(`${colors.blue}=== PerchPics HMA Integration Test Suite ===${colors.reset}`);
  console.log(`HMA Service URL: ${HMA_SERVICE_URL}`);
  console.log(`Bridge API URL: ${BRIDGE_API_URL}`);
  
  // Test HMA Service health
  await testHMAHealth();
  
  // Test Bridge Service health
  await testBridgeHealth();
  
  // Test Bridge API endpoints
  await testBridgeAPI();
  
  // Test image hashing
  await testImageHashing();
  
  // Test image matching
  await testImageMatching();
  
  console.log(`\n${colors.blue}=== Test Suite Complete ===${colors.reset}`);
}

// Run all tests
runAllTests().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
}); 