// Simple test script to verify n8n integration
require('dotenv').config();

const { n8nChatService } = require('./lib/n8n-chat-service');

async function testN8nIntegration() {
  console.log('Testing n8n integration...');
  
  try {
    // Test connection
    const connectionTest = await n8nChatService.testConnection();
    console.log('Connection test result:', connectionTest);
    
    if (connectionTest.success) {
      // Send a test message
      console.log('\nSending test message...');
      const response = await n8nChatService.sendMessage(
        'Hello from T-Office test!',
        [{ role: 'user', content: 'Previous message' }]
      );
      
      console.log('Response received:', response.message);
      console.log('Test completed successfully!');
    } else {
      console.log('Skipping message test due to connection failure.');
    }
  } catch (error) {
    console.error('Test failed with error:', error.message);
  }
}

// Run the test
testN8nIntegration();