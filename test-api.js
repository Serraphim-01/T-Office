const fs = require('fs');

// Read the token from localStorage in the browser and save it to a file
// This is just a placeholder - in a real scenario, you would get this from your app
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJkZXBhcnRtZW50IjoiQWRtaW4iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3MTc0ODQ0MDB9.5_MtYsF8u5l_aGpDQfB9Qw5y5x5y5x5y5x5y5x5y5x5y'; // Replace with a valid token

// Save token to file
fs.writeFileSync('.token', token);
console.log('Token saved to .token file');

// Test the API endpoint
fetch('http://localhost:4000/api/admin/departments/1/roles', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
.then(response => response.json())
.then(data => {
  console.log('Roles data:', data);
})
.catch(error => {
  console.error('Error:', error);
});