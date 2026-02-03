import axios from 'axios';

// Type definitions
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatResponse {
  message: string;
  timestamp: Date;
}

class N8nChatService {
  private readonly N8N_WEBHOOK_URL: string;

  constructor() {
    // Get n8n webhook URL from environment variables
    this.N8N_WEBHOOK_URL = process.env.NEXT_PUBLIC_N8N_CHAT_WEBHOOK_URL || '';
    
    if (!this.N8N_WEBHOOK_URL) {
      console.warn('n8n webhook URL not found in environment variables');
      console.warn('Please set NEXT_PUBLIC_N8N_CHAT_WEBHOOK_URL in your environment variables');
    } else {
      console.log('✅ n8n webhook URL loaded successfully');
    }
  }

  /**
   * Send a message to n8n workflow
   * Sends the user message to the n8n webhook and waits for the response
   */
  async sendMessage(
    message: string, 
    conversationHistory: ChatMessage[] = []
  ): Promise<ChatResponse> {
    try {
      if (!this.N8N_WEBHOOK_URL) {
        throw new Error('n8n webhook URL is not configured');
      }

      // Prepare payload for n8n webhook
      const payload = {
        message: message,
        conversationHistory: conversationHistory,
        timestamp: new Date().toISOString(),
        source: 't-office-chatbot'
      };

      console.log('Sending message to n8n:', payload);

      const response = await axios.post(
        this.N8N_WEBHOOK_URL,
        payload,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 second timeout
        }
      );

      // Parse the response and extract the message properly
      const responseData = response.data;
      
      // Handle various response formats from n8n
      let botResponse: string;
      
      if (typeof responseData === 'string') {
        // If response is a plain string
        botResponse = responseData;
      } else if (typeof responseData === 'object') {
        // If response is an object, try to extract the message in various ways
        
        // Look for common message fields
        if (responseData.reply) {
          // Handle {"reply": "..."} format
          botResponse = responseData.reply;
        } else if (responseData.message) {
          // Handle {"message": "..."} format
          botResponse = responseData.message;
        } else if (responseData.text) {
          // Handle {"text": "..."} format
          botResponse = responseData.text;
        } else if (responseData.response) {
          // Handle {"response": "..."} format
          botResponse = responseData.response;
        } else if (responseData.output) {
          // Handle {"output": "..."} format
          botResponse = responseData.output;
        } else {
          // If none of the common fields exist, convert the whole object to string
          // but try to extract any text content if possible
          botResponse = this.extractMessageFromObject(responseData);
        }
      } else {
        // Fallback for unexpected response types
        botResponse = String(responseData);
      }

      if (!botResponse) {
        throw new Error('No response received from n8n workflow');
      }

      return {
        message: botResponse,
        timestamp: new Date()
      };

    } catch (error: any) {
      console.error('Error sending message to n8n:', error);
      
      // Handle specific error cases
      if (error.response) {
        const status = error.response.status;
        const errorMsg = error.response.data?.error?.message || error.response.data?.error || 'Unknown error';
        
        if (status === 404) {
          throw new Error('n8n webhook endpoint not found. Please check your n8n workflow URL.');
        } else if (status === 401 || status === 403) {
          throw new Error('Unauthorized access to n8n workflow. Please check your authentication.');
        } else if (status >= 400 && status < 500) {
          throw new Error(`Client error (${status}): ${errorMsg}`);
        } else if (status >= 500) {
          throw new Error(`Server error (${status}): ${errorMsg}. The n8n workflow may be unavailable.`);
        } else {
          throw new Error(`HTTP error: ${errorMsg}`);
        }
      } else if (error.request) {
        throw new Error('Network error: Unable to reach n8n workflow. Please check your connection and n8n server status.');
      } else {
        throw new Error(`Request failed: ${error.message}`);
      }
    }
  }

  /**
   * Helper method to extract message from complex objects
   */
  private extractMessageFromObject(obj: any): string {
    // Try to find the most likely field containing the message
    if (obj && typeof obj === 'object') {
      // Look for common message fields recursively
      for (const key of ['reply', 'message', 'text', 'response', 'output']) {
        if (obj[key]) {
          if (typeof obj[key] === 'string') {
            return obj[key];
          } else if (typeof obj[key] === 'object') {
            // Recursively extract from nested objects
            return this.extractMessageFromObject(obj[key]);
          }
        }
      }
      
      // If no common field found, try to stringify the response
      // but check if it contains any string values
      const stringValues = Object.values(obj).filter(value => typeof value === 'string');
      if (stringValues.length > 0) {
        return stringValues[0]; // Return the first string value found
      }
      
      // As a last resort, convert to JSON string
      return JSON.stringify(obj);
    }
    
    return String(obj);
  }

  /**
   * Test the connection to n8n workflow
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.N8N_WEBHOOK_URL) {
        return {
          success: false,
          message: 'n8n webhook URL is not configured'
        };
      }

      // Send a simple test message
      const response = await axios.post(
        this.N8N_WEBHOOK_URL,
        {
          message: 'test_connection',
          timestamp: new Date().toISOString(),
          source: 't-office-chatbot-test'
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      
      return {
        success: response.status >= 200 && response.status < 300,
        message: 'Connection successful'
      };
    } catch (error: any) {
      let errorMessage = 'Connection test failed';
      
      if (error.response?.data?.error) {
        errorMessage += `: ${error.response.data.error.message || error.response.data.error}`;
      } else if (error.message) {
        errorMessage += `: ${error.message}`;
      }
      
      return {
        success: false,
        message: errorMessage
      };
    }
  }
}

// Export singleton instance
export const n8nChatService = new N8nChatService();
export type { ChatMessage, ChatResponse };