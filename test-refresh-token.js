// Simple test script to debug refresh token endpoint
// Using built-in fetch if available, otherwise using http module

async function testRefreshToken() {
  try {
    console.log('Testing refresh token endpoint...');
    
    // Use the valid token we generated
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImRlcGFydG1lbnQiOiJBZG1pbiIsInJvbGUiOiJkZWZhdWx0IiwiaWF0IjoxNzY0MjU1MjEyLCJleHAiOjE3NjQyNTg4MTJ9.wvNbcJzNUcgGdm4ABbc3E-GG72MAUaZu7VcwT-_3hwc';
    console.log('Using token:', token);
    
    const url = 'http://localhost:4000/api/refresh-token';
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };
    
    console.log('Making request to:', url);
    
    const response = await fetch(url, options);
    
    console.log('Response status:', response.status);
    console.log('Response ok?', response.ok);
    
    const responseBody = await response.text();
    console.log('Response body:', responseBody);
    
    if (response.ok) {
      const data = JSON.parse(responseBody);
      console.log('Success:', data);
    } else {
      console.log('Error response:', responseBody);
    }
  } catch (error) {
    console.error('Request failed:', error);
  }
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
  console.log('Fetch not available, please run with Node.js 18+ or install node-fetch');
} else {
  testRefreshToken();
}