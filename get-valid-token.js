// Using built-in fetch if available

async function getValidToken() {
  try {
    // Load environment variables
    const fs = require('fs');
    const path = require('path');
    
    // Read the .env.local file
    const envPath = path.resolve('./backend/.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    // Parse the PRESET_ADMIN_PASSWORD
    const presetPasswordMatch = envContent.match(/PRESET_ADMIN_PASSWORD="([^"]+)"/);
    const presetPassword = presetPasswordMatch ? presetPasswordMatch[1] : 'password123';
    
    console.log('Using preset admin password:', presetPassword);
    
    // First, let's try to login to get a valid token
    const loginResponse = await fetch('http://localhost:4000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'ojeremiah721@gmail.com', // Using the correct email
        password: presetPassword
      }),
    });
    
    console.log('Login response status:', loginResponse.status);
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('Login successful, token:', loginData.token);
      
      // Now let's try to refresh the token
      const refreshResponse = await fetch('http://localhost:4000/api/refresh-token', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${loginData.token}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log('Refresh response status:', refreshResponse.status);
      
      const refreshData = await refreshResponse.text();
      console.log('Refresh response data:', refreshData);
    } else {
      const errorData = await loginResponse.text();
      console.log('Login failed:', errorData);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
  console.log('Fetch not available, please run with Node.js 18+');
} else {
  getValidToken();
}