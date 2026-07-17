import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { useAuthStore } from '../store/authStore';

export const client: AxiosInstance = axios.create({
  baseURL: '/single',
});

client.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const { username, password } = useAuthStore.getState();
    if (username && password) {
      config.headers['Authorization'] = `Basic ${btoa(`${username}:${password}`)}`;
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
      if (status === 401 || status === 403) {
        useAuthStore.getState().clearCredentials();
        // Only redirect if we are not already on the login page to avoid infinite loops
        if (window.location.pathname !== '/login') {
          window.location.replace('/login');
        }
      }
    }
    return Promise.reject(error);
  }
);
