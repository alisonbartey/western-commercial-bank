import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '', // Uses Vite proxy in dev
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Response interceptor for global error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Token expired or invalid role — could trigger logout here if needed
      console.warn('Authentication issue detected:', error.response.data?.error);
    }
    return Promise.reject(error);
  }
);

export default api;
