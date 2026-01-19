const { groqChatService } = require('./lib/groq-chat-service.js');

async function test() {
  console.log('🧪 Testing Groq API Integration...');
  
  try {
    // Test connection
    console.log('Testing connection...');
    const isConnected = await groqChatService.testConnection();
    console.log('Connection test result:', isConnected);
    
    if (isConnected) {
      console.log('Sending test message...');
      const response = await groqChatService.sendMessage('Hello, how are you?');
      console.log('Response received:', response.message.substring(0, 100) + '...');
    }
    
    console.log('✅ Test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

test();
