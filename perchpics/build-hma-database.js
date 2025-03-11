/**
 * Build HMA Database
 * 
 * This script builds an HMA database from sample images.
 * It processes each image in the demo_images folder, hashes them,
 * and stores them in the HMA database.
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
const HMA_API_URL = 'http://localhost:5000'; // Direct HMA service for debugging
const HMA_API_KEY = process.env.HMA_API_KEY || 'test_key';

// Create a bank in HMA for our sample images
const BANK_NAME = 'SAMPLE_IMAGES';
const BANK_DESCRIPTION = 'Sample images for testing';

/**
 * Sleep for a specified number of milliseconds
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Log a message with a timestamp
 */
function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

/**
 * Create a bank in the HMA database
 */
async function createBank() {
  try {
    log(`Creating bank "${BANK_NAME}"...`);
    
    const response = await fetch(`${HMA_BRIDGE_URL}/api/v1/admin/banks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HMA_API_KEY}`
      },
      body: JSON.stringify({
        name: BANK_NAME,
        description: BANK_DESCRIPTION
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      log(`Bank created successfully: ${JSON.stringify(result)}`);
      return result;
    } else {
      const errorText = await response.text();
      // If the bank already exists, that's fine
      if (errorText.includes('already exists')) {
        log(`Bank "${BANK_NAME}" already exists.`);
        return { name: BANK_NAME };
      }
      
      // Try direct connection if bridge fails
      log(`Bridge failed, trying direct connection to HMA service...`);
      const directResponse = await fetch(`${HMA_API_URL}/c/banks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: BANK_NAME,
          description: BANK_DESCRIPTION
        })
      });
      
      if (directResponse.ok) {
        const directResult = await directResponse.json();
        log(`Bank created successfully via direct connection: ${JSON.stringify(directResult)}`);
        return directResult;
      } else {
        const directErrorText = await directResponse.text();
        if (directErrorText.includes('already exists')) {
          log(`Bank "${BANK_NAME}" already exists (via direct connection).`);
          return { name: BANK_NAME };
        }
        throw new Error(`Failed to create bank: ${directResponse.status} ${directResponse.statusText} - ${directErrorText}`);
      }
    }
  } catch (error) {
    log(`Error creating bank: ${error.message}`);
    // Continue anyway, the bank might already exist
    return { name: BANK_NAME };
  }
}

/**
 * Hash an image and store it in the HMA database
 */
async function hashAndStoreImage(imagePath, bankName) {
  try {
    const fileName = path.basename(imagePath);
    log(`Processing image: ${fileName}`);
    
    // Create a form with the image
    const formData = new FormData();
    const fileStream = fs.createReadStream(imagePath);
    formData.append('image', fileStream, {
      filename: fileName,
      contentType: getContentType(fileName)
    });
    
    // Add metadata
    formData.append('metadata', JSON.stringify({
      source: 'demo_images',
      description: `Sample image ${fileName}`,
      original_name: fileName
    }));
    
    // Hash the image using bridge
    log(`Hashing image: ${fileName}`);
    const hashResponse = await fetch(`${HMA_BRIDGE_URL}/api/v1/hash`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HMA_API_KEY}`
      },
      body: formData
    });
    
    if (hashResponse.ok) {
      const hashResult = await hashResponse.json();
      log(`Successfully hashed image ${fileName}: ${JSON.stringify(hashResult)}`);
      
      if (!hashResult.hash) {
        throw new Error(`No hash returned for image ${fileName}`);
      }
      
      // Store the hash in the bank
      log(`Storing hash for image ${fileName} in bank ${bankName}`);
      
      // Try using the bridge admin endpoint first
      const bridgeStoreResponse = await fetch(`${HMA_BRIDGE_URL}/api/v1/admin/bank/${bankName}/signal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${HMA_API_KEY}`
        },
        body: JSON.stringify({
          hash: hashResult.hash,
          metadata: {
            source: 'demo_images',
            description: `Sample image ${fileName}`,
            original_name: fileName
          }
        })
      });
      
      // If that works, great! Otherwise, try direct connection
      if (bridgeStoreResponse.ok) {
        const storeResult = await bridgeStoreResponse.json();
        log(`Successfully stored hash for image ${fileName}: ${JSON.stringify(storeResult)}`);
        return { success: true, hash: hashResult.hash, fileName };
      } else {
        // If bridge fails, try direct connection to HMA
        log(`Bridge store failed, trying direct connection to HMA service...`);
        
        // Try direct connection to add the hash to the bank
        const directStoreResponse = await fetch(`${HMA_API_URL}/c/bank/${bankName}/signal`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            pdq: hashResult.hash,
            metadata: {
              source: 'demo_images',
              description: `Sample image ${fileName}`,
              original_name: fileName
            }
          })
        });
        
        if (directStoreResponse.ok) {
          const directStoreResult = await directStoreResponse.json();
          log(`Successfully stored hash for image ${fileName} via direct connection: ${JSON.stringify(directStoreResult)}`);
          return { success: true, hash: hashResult.hash, fileName };
        } else {
          const directErrorText = await directStoreResponse.text();
          throw new Error(`Failed to store hash via direct connection: ${directStoreResponse.status} ${directStoreResponse.statusText} - ${directErrorText}`);
        }
      }
    } else {
      const errorText = await hashResponse.text();
      throw new Error(`Failed to hash image: ${hashResponse.status} ${hashResponse.statusText} - ${errorText}`);
    }
  } catch (error) {
    log(`Error processing image ${imagePath}: ${error.message}`);
    return { success: false, error: error.message, fileName: path.basename(imagePath) };
  }
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
 * Try to upload an image directly to the bank
 */
async function uploadImageToBank(imagePath, bankName) {
  try {
    const fileName = path.basename(imagePath);
    log(`Uploading image directly to bank: ${fileName}`);
    
    // Create a form with the image
    const formData = new FormData();
    const fileStream = fs.createReadStream(imagePath);
    
    // Use 'photo' content type (not 'file')
    formData.append('photo', fileStream, {
      filename: fileName,
      contentType: getContentType(fileName)
    });
    
    // Add content type parameter
    formData.append('content_type', 'photo');
    
    // Try direct connection to upload the image to the bank
    const response = await fetch(`${HMA_API_URL}/c/bank/${bankName}/content`, {
      method: 'POST',
      body: formData
    });
    
    if (response.ok) {
      const result = await response.json();
      log(`Successfully uploaded image ${fileName} directly to bank: ${JSON.stringify(result)}`);
      return { success: true, result, fileName };
    } else {
      const errorText = await response.text();
      throw new Error(`Failed to upload image: ${response.status} ${response.statusText} - ${errorText}`);
    }
  } catch (error) {
    log(`Error uploading image ${imagePath}: ${error.message}`);
    return { success: false, error: error.message, fileName: path.basename(imagePath) };
  }
}

/**
 * Main function
 */
async function main() {
  try {
    log('Starting HMA database build process...');
    
    // Create the bank
    const bank = await createBank();
    
    // Get list of image files
    const files = fs.readdirSync(DEMO_IMAGES_PATH)
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext) && !file.startsWith('.');
      })
      .map(file => path.join(DEMO_IMAGES_PATH, file));
    
    log(`Found ${files.length} images to process.`);
    
    // Process each image with a small delay between requests
    const results = [];
    for (const file of files) {
      // First try the hash and store approach
      let result = await hashAndStoreImage(file, bank.name);
      
      // If that fails, try direct upload
      if (!result.success) {
        log(`Hash and store failed for ${file}, trying direct upload...`);
        result = await uploadImageToBank(file, bank.name);
      }
      
      results.push(result);
      
      // Add a small delay to avoid overwhelming the service
      await sleep(1000);
    }
    
    // Summarize results
    const successful = results.filter(r => r.success).length;
    log(`Database build complete. Successfully processed ${successful} of ${files.length} images.`);
    
    // Print failures if any
    const failures = results.filter(r => !r.success);
    if (failures.length > 0) {
      log(`Failed to process ${failures.length} images:`);
      failures.forEach(failure => {
        log(`- ${failure.fileName}: ${failure.error}`);
      });
    }
    
    return { success: true, processed: files.length, successful, failures: failures.length };
  } catch (error) {
    log(`Error building HMA database: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Run the main function
main().then(result => {
  log(`Process finished with result: ${JSON.stringify(result)}`);
  process.exit(result.success ? 0 : 1);
}).catch(error => {
  log(`Unhandled error: ${error.message}`);
  process.exit(1);
}); 