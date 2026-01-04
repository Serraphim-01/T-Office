// API utility functions to handle API calls with proper environment configuration

export const getApiUrl = (): string => {
  // Use NEXT_PUBLIC_API_URL from environment, fallback to localhost for development
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
};

export const apiRequest = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const apiUrl = getApiUrl();
  const url = `${apiUrl}${endpoint}`;
  
  // Set default headers
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };
  
  // Merge provided options with defaults
  const requestOptions: RequestInit = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };
  
  return fetch(url, requestOptions);
};

export const apiGet = async (endpoint: string, token?: string): Promise<Response> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return apiRequest(endpoint, {
    method: 'GET',
    headers,
  });
};

export const apiPost = async (endpoint: string, body?: any, token?: string): Promise<Response> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return apiRequest(endpoint, {
    method: 'POST',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
};

export const apiPut = async (endpoint: string, body?: any, token?: string): Promise<Response> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return apiRequest(endpoint, {
    method: 'PUT',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
};

export const apiDelete = async (endpoint: string, token?: string): Promise<Response> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return apiRequest(endpoint, {
    method: 'DELETE',
    headers,
  });
};