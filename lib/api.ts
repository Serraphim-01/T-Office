// API utility functions to handle API calls with proper environment configuration

// Function to handle token expiration and redirect to login
const handleTokenExpiration = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }
};

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
  
  const response = await fetch(url, requestOptions);
  
  // Handle token expiration
  if (response.status === 401 || response.status === 403) {
    handleTokenExpiration();
  }
  
  return response;
};

export const apiGet = async (endpoint: string, token?: string): Promise<Response> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await apiRequest(endpoint, {
    method: 'GET',
    headers,
  });
  
  // Handle token expiration
  if (response.status === 401 || response.status === 403) {
    handleTokenExpiration();
  }
  
  return response;
};

export const apiPost = async (endpoint: string, body?: any, token?: string): Promise<Response> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await apiRequest(endpoint, {
    method: 'POST',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  
  // Handle token expiration
  if (response.status === 401 || response.status === 403) {
    handleTokenExpiration();
  }
  
  return response;
};

export const apiPut = async (endpoint: string, body?: any, token?: string): Promise<Response> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await apiRequest(endpoint, {
    method: 'PUT',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  
  // Handle token expiration
  if (response.status === 401 || response.status === 403) {
    handleTokenExpiration();
  }
  
  return response;
};

export const apiDelete = async (endpoint: string, token?: string): Promise<Response> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await apiRequest(endpoint, {
    method: 'DELETE',
    headers,
  });
  
  // Handle token expiration
  if (response.status === 401 || response.status === 403) {
    handleTokenExpiration();
  }
  
  return response;
};

export const apiPatch = async (endpoint: string, body?: any, token?: string): Promise<Response> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await apiRequest(endpoint, {
    method: 'PATCH',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  
  // Handle token expiration
  if (response.status === 401 || response.status === 403) {
    handleTokenExpiration();
  }
  
  return response;
};