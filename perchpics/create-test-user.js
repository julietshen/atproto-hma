// Script to create a test user for PerchPics
import fetch from 'node-fetch';

async function createTestUser() {
  try {
    console.log('Creating test user...');
    const response = await fetch('http://localhost:3001/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'testuser',
        password: 'perchpics123'
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Failed to create test user:', errorData);
      return;
    }
    
    const data = await response.json();
    console.log('Test user created successfully!');
    console.log('Username: testuser');
    console.log('Password: perchpics123');
  } catch (error) {
    console.error('Error creating test user:', error);
  }
}

createTestUser(); 