# n8n Integration Guide for T-Office Chatbot

This guide explains how to integrate your T-Office chatbot with an n8n workflow. You can use either an external n8n instance (recommended) or run n8n within the T-Office project.

## Prerequisites

- Docker and Docker Compose installed
- Running T-Office application with the updated code
- n8n instance running (either external or within the project)

## Option 1: Using External n8n Instance (Recommended)

Most users will have an existing n8n instance running separately. This approach keeps services isolated.

### 1. Configure Webhook URL

Update your [.env.local](file:///Users/serraphim/Desktop/T-Office/.env.local) file with the correct n8n webhook URL:

```env
NEXT_PUBLIC_N8N_CHAT_WEBHOOK_URL="http://localhost:5678/webhook/chat"
```

If your n8n is running on a different host or port, adjust accordingly:
```env
NEXT_PUBLIC_N8N_CHAT_WEBHOOK_URL="http://your-n8n-host:port/webhook/chat"
NEXT_PUBLIC_N8N_CHAT_WEBHOOK_URL="https://your-n8n-domain.com/webhook/chat"
```

### 2. Start T-Office Services

Start only the T-Office services:

```bash
docker-compose up -d
```

This starts:
- Frontend on http://localhost:3001
- Backend on http://localhost:4000
- PostgreSQL database

### 3. Configure Your External n8n Workflow

#### Access n8n Interface
Open your external n8n instance in your browser (typically http://localhost:5678).

#### Create/Update Workflow
1. Create or open your existing "T-Office Chat Handler" workflow
2. Make sure the webhook URL path is `/webhook/chat`

#### Configure Webhook Node
Settings:
- Path: `/webhook/chat`
- Method: `POST`
- Response: `Respond to webhook`
- Response Mode: `Last Node`

#### Process the Message
Add a Function node to process incoming data:

```javascript
const message = $input.first().json.message;
const conversationHistory = $input.first().json.conversationHistory || [];

// Your custom processing logic here
let responseMessage = `Received: ${message}`;

// Call AI services, databases, etc.

return {
    json: {
        message: responseMessage,
        timestamp: new Date().toISOString(),
        processedBy: 'n8n-external'
    }
};
```

#### Configure Response
Add a Respond to Webhook node to send the response back to T-Office.

### 4. Activate the Workflow
Toggle the workflow to active status.

### 5. Test Integration
1. Open T-Office at http://localhost:3001
2. Use the chatbot sidebar
3. Messages should flow from T-Office → n8n → T-Office

## Option 2: Running n8n Within T-Office Project

If you prefer to run n8n as part of the T-Office stack, you can add it to the docker-compose.yml:

### 1. Update docker-compose.yml

Add the n8n service to your [docker-compose.yml](file:///Users/serraphim/Desktop/T-Office/docker-compose.yml):

```yaml
services:
  # ... existing services ...

  n8n:
    image: n8nio/n8n:latest
    container_name: office-n8n
    ports:
      - "5678:5678"
    volumes:
      - n8n_data:/home/node/.n8n
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=password
      - WEBHOOK_URL=http://localhost:5678
    networks:
      - office-network

  # ... other services ...

networks:
  office-network:
    driver: bridge

volumes:
  # ... existing volumes ...
  n8n_data:
```

### 2. Configure Webhook URL

Update your [.env.local](file:///Users/serraphim/Desktop/T-Office/.env.local) to point to the internal n8n service:

```env
NEXT_PUBLIC_N8N_CHAT_WEBHOOK_URL="http://localhost:5678/webhook/chat"
```

### 3. Start Full Stack

Start all services including n8n:

```bash
docker-compose up -d
```

### 4. Configure n8n Workflow

Follow the same workflow configuration steps as in Option 1.

## Response Format Handling

The T-Office n8n service intelligently handles various response formats from n8n:

- `{"reply": "Your message"}` → Displays: "Your message"
- `{"message": "Your message"}` → Displays: "Your message" 
- `{"text": "Your message"}` → Displays: "Your message"
- `{"response": "Your message"}` → Displays: "Your message"
- Other formats → Attempts to extract meaningful text

## Alternative Processing Examples

### Advanced AI Processing
You can replace the simple echo function with actual AI processing:

```javascript
const message = $input.first().json.message;

// Example: Call OpenAI API
const openaiResponse = await openai.createChatCompletion({
  model: "gpt-3.5-turbo",
  messages: [{role: "user", content: message}]
});

return {
    json: {
        message: openaiResponse.data.choices[0].message.content,
        timestamp: new Date().toISOString()
    }
};
```

### Database Integration
```javascript
const message = $input.first().json.message;
const userId = $input.first().json.userId;

// Query your database
const userContext = await queryDatabase(`SELECT * FROM user_context WHERE user_id = ${userId}`);

// Process with context
const response = processWithContext(message, userContext);

return {
    json: {
        message: response,
        timestamp: new Date().toISOString()
    }
};
```

## Troubleshooting

### Common Issues

- **Connection Issues**: Verify n8n is accessible from T-Office container
- **404 Errors**: Check webhook path matches exactly `/webhook/chat`
- **Timeout Errors**: Ensure n8n workflow responds within 30 seconds
- **JSON Display Issue**: Make sure your n8n workflow returns the message in a recognizable field name (reply, message, text, response, output)
- **Network Issues**: Test connectivity between services

### Testing Commands

Test webhook directly:
```bash
curl -X POST http://localhost:5678/webhook/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello","conversationHistory":[],"timestamp":"2026-02-03T10:00:00Z","source":"t-office"}'
```

Check service status:
```bash
docker-compose ps
```

Test the integration:
```bash
node test_n8n_integration.js
```

### Debugging Tips

If you're seeing raw JSON in the chat like `{"reply":"Hello from n8n 👋"}`, check that:
1. Your n8n workflow is returning the response in a recognizable field name
2. The n8n workflow is configured to use "Respond to Webhook" node
3. The response format matches what the service expects

## Security Best Practices

For production environments:
- Use HTTPS for webhook communication
- Implement authentication headers between services
- Add rate limiting in n8n workflows
- Use environment-specific webhook URLs
- Monitor and log webhook requests
- Change default n8n credentials if running internally