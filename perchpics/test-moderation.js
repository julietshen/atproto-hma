/**
 * Test script for Altitude UI integration
 * 
 * This script logs in as the admin user and then checks if the moderation page is accessible.
 */

import fetch from 'node-fetch';

// Configuration
const PDS_URL = 'http://localhost:3002';

// Test the admin login
async function testAdminLogin() {
  console.log('Testing admin login...');
  
  try {
    const response = await fetch(`${PDS_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'adminpassword'
      })
    });
    
    if (!response.ok) {
      throw new Error(`Login failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Login successful. Token received.');
    return data.token;
  } catch (error) {
    console.error('Login test failed:', error.message);
    return null;
  }
}

// Test the user role API
async function testUserRole(token) {
  console.log('Testing user role API...');
  
  try {
    const response = await fetch(`${PDS_URL}/api/user/role`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`User role check failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('User role check successful:', data);
    return data.role === 'admin';
  } catch (error) {
    console.error('User role test failed:', error.message);
    return false;
  }
}

// Test the Altitude config API
async function testAltitudeConfig(token) {
  console.log('Testing Altitude config API...');
  
  try {
    const response = await fetch(`${PDS_URL}/api/config/altitude`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Altitude config check failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Altitude config check successful:', data);
    return data;
  } catch (error) {
    console.error('Altitude config test failed:', error.message);
    return null;
  }
}

// Run the tests
async function runTests() {
  console.log('Starting Altitude UI integration tests...');
  
  // Step 1: Login as admin
  const token = await testAdminLogin();
  if (!token) {
    console.error('Tests failed: Could not log in as admin.');
    return;
  }
  
  // Step 2: Check if user is admin
  const isAdmin = await testUserRole(token);
  if (!isAdmin) {
    console.error('Tests failed: User is not an admin.');
    return;
  }
  
  // Step 3: Check Altitude configuration
  const altitudeConfig = await testAltitudeConfig(token);
  if (!altitudeConfig) {
    console.error('Tests failed: Could not get Altitude configuration.');
    return;
  }
  
  console.log('\nALL TESTS PASSED!');
  console.log('The ModReview component can be tested by:');
  console.log('1. Log in as admin (username: admin, password: adminpassword)');
  console.log('2. Click on the "Moderation" link in the navbar');
  console.log('3. Verify that the ModReview component loads correctly');
  console.log('4. Check that the iframe is created with the URL:', altitudeConfig.url);
}

// Run the tests
runTests(); 