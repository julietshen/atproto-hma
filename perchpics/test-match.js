/**
 * Test HMA Match Functionality
 * 
 * This script tests the image matching functionality by uploading one of the sample images
 * and checking if it matches against the HMA database.
 */

import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import FormData from 'form-data';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const DEMO_IMAGES_PATH = path.resolve('../demo_images');
const HMA_BRIDGE_URL = 'http://localhost:3001';
const HMA_API_KEY = process.env.HMA_API_KEY || 'test_key';

/**
 * Log a message with a timestamp
 */
function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

/**
 * Get content type based on file extension
 */
function getContentType(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.gif':
      return 'image/gif';
    case '.webp':
      return 'image/webp';
    default:
      return 'application/octet-stream';
  }
}

/**
 * Match an image against the HMA database
 */
async function matchImage(imagePath) {
  try {
    const fileName = path.basename(imagePath);
    log(`Matching image: ${fileName}`);
    
    // Create a form with the image
    const formData = new FormData();
    const fileStream = fs.createReadStream(imagePath);
    formData.append('image', fileStream, {
      filename: fileName,
      contentType: getContentType(fileName)
    });
    
    // Send the image for matching
    const matchResponse = await fetch(`${HMA_BRIDGE_URL}/api/v1/match`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HMA_API_KEY}`
      },
      body: formData
    });
    
    if (matchResponse.ok) {
      const matchResult = await matchResponse.json();
      log(`Match result: ${JSON.stringify(matchResult)}`);
      return matchResult;
    } else {
      const errorText = await matchResponse.text();
      throw new Error(`Failed to match image: ${matchResponse.status} ${matchResponse.statusText} - ${errorText}`);
    }
  } catch (error) {
    log(`Error matching image ${imagePath}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Main function
 */
async function main() {
  try {
    log('Starting HMA match test...');
    
    // Get list of image files
    const files = fs.readdirSync(DEMO_IMAGES_PATH)
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext) && !file.startsWith('.');
      })
      .map(file => path.join(DEMO_IMAGES_PATH, file));
    
    if (files.length === 0) {
      throw new Error('No image files found in the demo_images directory');
    }
    
    // Select a random image to test
    const testImagePath = files[Math.floor(Math.random() * files.length)];
    log(`Selected test image: ${testImagePath}`);
    
    // Match the image against the HMA database
    const matchResult = await matchImage(testImagePath);
    
    // Check if we got any matches
    if (matchResult.success) {
      const matches = matchResult.matches || [];
      if (matches.length > 0) {
        log(`✅ SUCCESS: Found ${matches.length} matches in the HMA database!`);
        matches.forEach((match, index) => {
          log(`Match ${index + 1}:`);
          log(`  Bank: ${match.bank}`);
          log(`  Content ID: ${match.content_id}`);
          log(`  Distance: ${match.distance}`);
          log(`  Hash: ${match.hash}`);
          if (match.metadata) {
            log(`  Metadata: ${JSON.stringify(match.metadata)}`);
          }
        });
      } else {
        log(`❌ FAILURE: No matches found in the HMA database`);
      }
    } else {
      log(`❌ FAILURE: Match request failed: ${matchResult.error || 'Unknown error'}`);
    }
    
    return { success: true };
  } catch (error) {
    log(`❌ ERROR: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Run the main function
main().then(result => {
  if (result.success) {
    log('Test completed successfully');
    process.exit(0);
  } else {
    log(`Test failed: ${result.error}`);
    process.exit(1);
  }
}).catch(error => {
  log(`Unhandled error: ${error.message}`);
  process.exit(1);
}); 