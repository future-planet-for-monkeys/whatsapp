import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface JWTContents {
  userId: string;
  name: string;
}

export interface AuthState {
  username: string | null;
  password: string | null;
  token: string | null;
  user: JWTContents | null;
  setCredentials: (username: string, password: string) => void;
  setToken: (token: string, user: JWTContents) => void;
  clearCredentials: () => void;
  clearToken: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      username: null,
      password: null,
      token: null,
      user: null,
      setCredentials: (username: string, password: string): void => {
        set({ username, password });
      },
      setToken: (token: string, user: JWTContents): void => {
        set({ token, user });
      },
      clearCredentials: (): void => {
        set({ username: null, password: null, token: null, user: null });
      },
      clearToken: (): void => {
        set({ token: null, user: null });
      },
    }),
    {
      name: 'whatsapp-pwa-auth',
    }
  )
);
