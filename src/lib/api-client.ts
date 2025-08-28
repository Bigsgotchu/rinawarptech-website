const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.rinawarptech.com';

type RequestOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
};

async function request(endpoint: string, options: RequestOptions = {}) {
  const { method = 'GET', headers = {}, body } = options;

  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    credentials: 'include', // Send cookies for auth
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

export const api = {
  get: (endpoint: string, headers = {}) => 
    request(endpoint, { headers }),

  post: (endpoint: string, body: any, headers = {}) => 
    request(endpoint, { method: 'POST', body, headers }),

  put: (endpoint: string, body: any, headers = {}) => 
    request(endpoint, { method: 'PUT', body, headers }),

  delete: (endpoint: string, headers = {}) => 
    request(endpoint, { method: 'DELETE', headers }),
};
