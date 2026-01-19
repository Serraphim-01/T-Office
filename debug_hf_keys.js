#!/usr/bin/env node

// Quick debug script to check API keys and basic connectivity

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend/.env.local') });

console.log('Environment variables check:');
console.log('HUGGING_FACE_INFERENCE_API_KEY:', process.env.HUGGING_FACE_INFERENCE_API_KEY ? '✓ Loaded' : '✗ Missing');
console.log('HUGGING_FACE_TASK_API_KEY:', process.env.HUGGING_FACE_TASK_API_KEY ? '✓ Loaded' : '✗ Missing');

if (process.env.HUGGING_FACE_INFERENCE_API_KEY) {
  console.log('API Key prefix:', process.env.HUGGING_FACE_INFERENCE_API_KEY.substring(0, 10) + '...');
}

// Test basic HTTP request without specific model
const axios = require('axios');

async function testBasicConnectivity() {
  try {
    console.log('\nTesting basic API connectivity...');
    
    const response = await axios.get('https://huggingface.co/api/models/gpt2', {
      timeout: 10000
    });
    
    console.log('✅ Basic connectivity test PASSED');
    console.log('Status:', response.status);
    
  } catch (error) {
    console.log('❌ Basic connectivity test FAILED:', error.message);
  }
}

testBasicConnectivity();