import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';

/**
 * Axios instance pre-configured for the WhatsApp API.
 *
 * In production, nginx reverse-proxies /api/* to the backend, so the baseURL
 * is relative. In development, Vite's dev server proxies /api to localhost:3022.
 */
const apiClient = axios.create({
  baseURL: '/api',
  timeout: 30_000,
  headers: {
    Accept: 'application/json',
  },
});

/**
 * Request interceptor that injects the Basic Auth header on every request.
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const credentials = useAuthStore.getState().credentials;
    if (credentials) {
      const encoded = btoa(`${credentials.username}:${credentials.password}`);
      config.headers.Authorization = `Basic ${encoded}`;
    }
    return config;
  },
  (error: AxiosError): Promise<AxiosError> => Promise.reject(error),
);

/**
 * Response interceptor that handles 401/403 by clearing auth and redirecting.
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError): Promise<AxiosError> => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      useAuthStore.getState().clearCredentials();
      // Only redirect if we're not already on the login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default apiClient;