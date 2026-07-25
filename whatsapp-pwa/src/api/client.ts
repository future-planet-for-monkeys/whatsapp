import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { useAuthStore } from '../store/authStore';

export const client: AxiosInstance = axios.create({
  baseURL: '/single',
});

client.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const { username, password, token } = useAuthStore.getState();
    const url = config.url ?? '';

    // Auth endpoints (login/signup) use Basic auth with system credentials
    if (url === '/auth/login' || url === '/auth/signup') {
      if (username && password) {
        config.headers['Authorization'] = `Basic ${btoa(`${username}:${password}`)}`;
      }
      return config;
    }

    // All other endpoints use Bearer JWT
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    return config;
  },
  (error: unknown): Promise<never> => {
    return Promise.reject(error);
  }
);

client.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => {
    return response;
  },
  (error: AxiosError): Promise<never> => {
    if (error.response) {
      const status = error.response.status;
      // Only 401 (Unauthorized) indicates the JWT/credentials are missing,
      // invalid, or expired — see middleware/auth.ts, which always rejects
      // with 401 for auth failures. 403 (Forbidden) is used by several
      // endpoints for unrelated business-logic restrictions (e.g. editing
      // another user's message, or updating labels on a non-Business
      // account) and must NOT log the user out.
      if (status === 401) {
        const { token, clearToken, clearCredentials } = useAuthStore.getState();
        if (token) {
          clearToken();
        } else {
          clearCredentials();
        }
        // Only redirect if we are not already on the login page to avoid infinite loops
        if (window.location.pathname !== '/login') {
          window.location.replace('/login');
        }
      }
    }
    return Promise.reject(error);
  }
);
