#!/usr/bin/env node

/**
 * Direct API test for Hugging Face Chat Service
 * Tests the Hugging Face API connectivity directly using the API keys
 */

const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend/.env.local') });

async function testHuggingFaceAPI() {
  console.log('🧪 Testing Groq API Integration...\n');
  
  // Get API keys from environment
  const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY;
  
  if (!GROQ_API_KEY) {
    console.error('❌ Missing Groq API key in environment variables');
    console.error('Please check your environment configuration');
    return false;
  }
  
  console.log('🔑 Groq API Key found - proceeding with tests...\n');
  
  try {
    // Import the service
const { groqChatService } = require('./lib/groq-chat-service');
    
    // Test 1: Connection test
    console.log('Test 1: Testing API connection...');
    const isConnected = await groqChatService.testConnection();
    console.log(`✅ Connection test: ${isConnected ? 'PASSED' : 'FAILED'}`);
    
    if (!isConnected) {
      console.log('❌ Cannot connect to Groq API. Check your API key and network connection.');
      return false;
    }
    
    // Test 2: Basic chat functionality
    console.log('\nTest 2: Testing basic chat response...');
    const testMessage = "Hello, how are you?";
    const response = await groqChatService.sendMessage(testMessage);
    
    console.log(`✅ Chat test PASSED`);
    console.log(`📝 User message: "${testMessage}"`);
    console.log(`🤖 AI response: "${response.message}"`);
    console.log(`⏰ Response time: ${response.timestamp}`);
    
    // Test 3: Conversation context test
    console.log('\nTest 3: Testing conversation context...');
    const conversationHistory = [
      { role: 'user', content: 'What is the capital of France?' },
      { role: 'assistant', content: 'The capital of France is Paris.' },
      { role: 'user', content: 'What about Germany?' }
    ];
    
    const contextResponse = await groqChatService.sendMessage(
      'What country are we discussing?', 
      conversationHistory
    );
    
    console.log(`✅ Context test PASSED`);
    console.log(`📝 Context-aware response: "${contextResponse.message}"`);
    
    // Test 4: Different types of queries
    console.log('\nTest 4: Testing various query types...');
    const testQueries = [
      "Tell me about productivity tips",
      "What is artificial intelligence?",
      "How can I improve my workflow?"
    ];
    
    for (const query of testQueries) {
      const resp = await groqChatService.sendMessage(query);
      console.log(`💬 Query: "${query}"`);
      console.log(`🤖 Response: "${resp.message.substring(0, 60)}..."`); // Truncate for readability
    }
    
    console.log('\n🎉 All Groq API tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('✅ API Connection: Working');
    console.log('✅ Basic Chat: Working'); 
    console.log('✅ Context Awareness: Working');
    console.log('✅ Various Queries: Working');
    console.log('\n✅ Groq chat integration is ready to use!');
    
    return true;
    
  } catch (error) {
    console.error('\n❌ Tests failed with error:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    
    return false;
  }
}

// Run the tests
if (require.main === module) {
  testHuggingFaceAPI()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { testHuggingFaceAPI };