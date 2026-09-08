import axios from 'axios';

export const getApiBaseUrl = () => {
  let url = import.meta.env.VITE_API_URL || '';
  if (!url) return '/api';
  url = url.replace(/\/+$/, '');
  if (!url.endsWith('/api')) {
    url += '/api';
  }
  return url;
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 30000
});

// Request interceptor to attach JWT and ensure dynamic host resolution
api.interceptors.request.use(
  (config) => {
    config.baseURL = getApiBaseUrl();
    const token = localStorage.getItem('ananta_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for consistent error handling
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred. Please try again.';

    if (error.response?.status === 401) {
      // Clear token on 401
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('ananta_token');
        localStorage.removeItem('ananta_user');
      }
    }

    return Promise.reject(new Error(message));
  }
);

export default api;
