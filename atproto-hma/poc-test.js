/**
 * AT Protocol + HMA Integration Proof of Concept
 * 
 * This script demonstrates a basic integration between AT Protocol content
 * from PerchPics and the hasher-matcher-actioner (HMA) pipeline.
 */

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

// Configuration
const config = {
  // PerchPics configuration
  perchpics: {
    apiUrl: 'http://localhost:3001', // Local PDS server
    testUser: {
      username: 'testuser',
      password: 'testpassword'
    }
  },
  // HMA configuration
  hma: {
    apiUrl: 'http://localhost:8000', // HMA service
    apiKey: 'test-api-key'
  },
  // Use existing image from PerchPics
  testImagePath: path.join(__dirname, '../perchpics/data/blobs/42708796d35c2b752a0e91bd7c07430d.jpg')
};

// Helper functions
async function login() {
  console.log('Logging in to PerchPics...');
  
  try {
    const response = await fetch(`${config.perchpics.apiUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: config.perchpics.testUser.username,
        password: config.perchpics.testUser.password
      })
    });
    
    const data = await response.json();
    
    if (!data.token) {
      throw new Error('Failed to login: No token received');
    }
    
    console.log('Login successful');
    return data.token;
  } catch (error) {
    console.error('Login failed:', error.message);
    throw error;
  }
}

async function processExistingImage(token, imagePath) {
  console.log('Processing existing image from PerchPics...');
  
  try {
    // Get the image filename
    const filename = path.basename(imagePath);
    
    // Construct the AT Protocol URI for this image
    // This is a simplified example - in a real implementation, we would query the database
    // to get the actual URI for this image
    const contentUri = `at://did:plc:testuser/app.perchpics.photo/${filename.split('.')[0]}`;
    
    console.log('Using existing image:', filename);
    console.log('Simulated AT Protocol URI:', contentUri);
    
    return {
      uri: contentUri,
      imageUrl: `${config.perchpics.apiUrl}/images/${filename}`,
      filename: filename
    };
  } catch (error) {
    console.error('Image processing failed:', error.message);
    throw error;
  }
}

async function processImageWithHMA(imageUrl) {
  console.log('Processing image with HMA...');
  
  try {
    // Step 1: Hash the image
    console.log('Hashing image from URL:', imageUrl);
    
    // In a real implementation, this would call the actual HMA API
    // For this POC, we'll simulate the response
    const hashData = {
      pdq: "f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8",
      md5: "42708796d35c2b752a0e91bd7c07430d",
      quality: 0.95
    };
    
    console.log('Image hashed successfully');
    console.log('Hash results:', hashData);
    
    // Step 2: Match the hash against known databases
    console.log('Matching hash against known databases...');
    
    // In a real implementation, this would call the actual HMA API
    // For this POC, we'll simulate the response
    const matchData = [
      {
        bank_id: "test_bank_1",
        hash: "f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8",
        distance: 0.15,
        metadata: {
          category: "test",
          severity: "medium"
        }
      }
    ];
    
    console.log('Hash matching completed');
    console.log('Match results:', matchData);
    
    return {
      hashData,
      matchData
    };
  } catch (error) {
    console.error('HMA processing failed:', error.message);
    throw error;
  }
}

async function takeActionBasedOnMatches(contentUri, matchResults) {
  console.log('Taking action based on match results...');
  
  // Determine if any action is needed based on match results
  const highConfidenceMatches = matchResults.filter(match => 
    (1.0 - match.distance) > 0.8
  );
  
  if (highConfidenceMatches.length > 0) {
    console.log('High confidence matches found, initiating takedown...');
    
    try {
      // In a real implementation, this would call the actual HMA API
      // For this POC, we'll simulate the response
      const takedownData = {
        action: "takedown",
        contentUri: contentUri,
        status: "completed",
        timestamp: new Date().toISOString()
      };
      
      console.log('Takedown action completed');
      console.log('Takedown results:', takedownData);
      
      return takedownData;
    } catch (error) {
      console.error('Takedown action failed:', error.message);
      throw error;
    }
  } else {
    console.log('No high confidence matches found, no action needed');
    return { action: 'none', reason: 'No high confidence matches' };
  }
}

// Main function to run the proof of concept
async function runProofOfConcept() {
  console.log('Starting AT Protocol + HMA Integration Proof of Concept');
  console.log('---------------------------------------------------');
  console.log('This test demonstrates how content from the AT Protocol');
  console.log('can be processed through the HMA pipeline for content moderation.');
  console.log('---------------------------------------------------');
  
  try {
    // Step 1: Login to PerchPics (simulated)
    const token = await login();
    
    // Step 2: Process an existing image from PerchPics
    const imageInfo = await processExistingImage(token, config.testImagePath);
    
    // Step 3: Process the image with HMA
    const hmaResults = await processImageWithHMA(imageInfo.imageUrl);
    
    // Step 4: Take action based on match results
    const actionResult = await takeActionBasedOnMatches(
      imageInfo.uri,
      hmaResults.matchData
    );
    
    console.log('---------------------------------------------------');
    console.log('Proof of concept completed successfully');
    console.log('Summary:');
    console.log('- Existing image from PerchPics processed');
    console.log('- Image processed through HMA pipeline');
    console.log(`- Action taken: ${actionResult.action || 'none'}`);
    console.log('---------------------------------------------------');
    
    return {
      imageInfo,
      hmaResults,
      actionResult
    };
  } catch (error) {
    console.error('Proof of concept failed:', error.message);
    process.exit(1);
  }
}

// Run the proof of concept
runProofOfConcept()
  .then(results => {
    console.log('Results:', JSON.stringify(results, null, 2));
  })
  .catch(error => {
    console.error('Error:', error);
  }); 