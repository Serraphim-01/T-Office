import { NextRequest } from 'next/server';
import { apiPost } from '@/lib/api';

export async function POST(request: NextRequest) {
  try {
    const { question, sessionId } = await request.json();
    
    // Get the token from the authorization header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

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