import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api';

export const apiClient: AxiosInstance = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  timeout: 30000
});

// Request interceptor: Attach dev bearer token if present in localStorage
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const devToken = localStorage.getItem('reachinbox_token');
    if (devToken && config.headers) {
      config.headers.Authorization = `Bearer ${devToken}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// Response interceptor: Extract clean error message without leaking internals
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: string; message?: string }>) => {
    if (!error.response) {
      // Network failure or CORS issue
      return Promise.reject(new Error('Network error. Unable to connect to backend server.'));
    }

    const { status, data } = error.response;
    const serverMessage = data?.error || data?.message;

    if (status === 401) {
      // Unauthorized: clear dev token if invalid
      if (window.location.pathname !== '/login') {
        // Allow components/auth context to trigger redirection cleanly
      }
    }

    if (status === 429) {
      return Promise.reject(new Error(serverMessage || 'Rate limit exceeded. Please wait before retrying.'));
    }

    if (status >= 500) {
      return Promise.reject(new Error(serverMessage || 'Internal server error. Please try again later.'));
    }

    return Promise.reject(new Error(serverMessage || error.message || 'An unexpected error occurred.'));
  }
);

export default apiClient;
