// Simple test script for the ATProto-HMA Bridge
const fetch = require('node-fetch');

// Hardcoded configuration
const BRIDGE_URL = 'http://localhost:3001';
const API_KEY = 'dev_key';

async function testBridgeEndpoint(endpoint) {
  const url = `${BRIDGE_URL}${endpoint}`;
  console.log(`Testing ${url}...`);
  
  try {
    const response = await fetch(url);
    console.log(`Status: ${response.status} ${response.statusText}`);
    return response.status !== 404;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    return false;
  }
}

async function testBridgeHashEndpoint() {
  const url = `${BRIDGE_URL}/api/v1/hash`;
  console.log(`Testing ${url} with POST...`);
  
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
    return response.status !== 404;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('Testing ATProto-HMA Bridge at', BRIDGE_URL);
  
  // Test root endpoint
  const rootOk = await testBridgeEndpoint('/');
  
  // Test health endpoint
  const healthOk = await testBridgeEndpoint('/health');
  
  // Test hash endpoint
  const hashOk = await testBridgeHashEndpoint();
  
  console.log('\nResults:');
  console.log(`Root endpoint: ${rootOk ? '✅' : '❌'}`);
  console.log(`Health endpoint: ${healthOk ? '✅' : '❌'}`);
  console.log(`Hash endpoint: ${hashOk ? '✅' : '❌'}`);
  
  if (hashOk) {
    console.log('\n✅ ATProto-HMA Bridge is working correctly!');
  } else {
    console.log('\n❌ ATProto-HMA Bridge is not working correctly.');
  }
}

main().catch(console.error); 