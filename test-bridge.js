/**
 * Simple test script for ATProto-HMA Bridge
 */
const fetch = require('node-fetch');

const BRIDGE_URL = 'http://localhost:3001';
const HMA_URL = 'http://localhost:5000';
const API_KEY = 'dev_key';

async function testEndpoint(baseUrl, endpoint) {
  const url = `${baseUrl}${endpoint}`;
  console.log(`Testing ${url}...`);
  
  try {
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
        console.log('Response:', data);
      } catch (e) {
        const text = await response.text();
        console.log('Response text:', text.substring(0, 100));
      }
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    return false;
  }
}

async function testPostEndpoint(url) {
  console.log(`Testing POST to ${url}...`);
  
  try {
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
    
    // Even a 400 Bad Request is OK - means endpoint exists
    return response.status !== 404;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('===== Testing ATProto-HMA Bridge =====');
  
  console.log('\n----- BRIDGE SERVICE (port 3001) -----');
  const bridgeHealthOk = await testEndpoint(BRIDGE_URL, '/health');
  console.log(`Bridge health endpoint: ${bridgeHealthOk ? '✅' : '❌'}`);
  
  const bridgeHashOk = await testPostEndpoint(`${BRIDGE_URL}/api/v1/hash`);
  console.log(`Bridge hash endpoint: ${bridgeHashOk ? '✅' : '❌'}`);
  
  console.log('\n----- HMA SERVICE (port 5000) -----');
  // HMA doesn't have a standard /health endpoint but the root may work
  const hmaRootOk = await testEndpoint(HMA_URL, '/');
  console.log(`HMA root endpoint: ${hmaRootOk ? '✅' : '❌'}`);
  
  console.log('\n===== Results =====');
  if (bridgeHealthOk && bridgeHashOk) {
    console.log('✅ ATProto-HMA Bridge appears to be working correctly!');
  } else {
    console.log('❌ Issues found with ATProto-HMA Bridge');
  }
}

main().catch(console.error); 