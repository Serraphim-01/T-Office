import { NextRequest } from 'next/server';
import { apiPost } from '@/lib/api';

export async function POST(request: NextRequest) {
  try {
    const { question, sessionId } = await request.json();
    
    // Get the token from the authorization header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;

    // Validate token exists and is not malformed
    if (!token || token.length < 10) { // Basic validation to avoid sending invalid tokens
      return Response.json(
        { error: 'Invalid or missing authorization token' },
        { status: 401 }
      );
    }

    // Forward the request to the backend
    const backendResponse = await apiPost('/api/chatbot/ask', { question, sessionId }, token);

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json();
      return Response.json(
        { error: errorData.error || 'Backend request failed' },
        { status: backendResponse.status }
      );
    }

    const data = await backendResponse.json();
    return Response.json(data);
  } catch (error) {
    console.error('Chatbot API error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}