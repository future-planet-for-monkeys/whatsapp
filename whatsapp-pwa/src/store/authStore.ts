import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthState {
  username: string | null;
  password: string | null;
  setCredentials: (username: string, password: string) => void;
  clearCredentials: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      username: null,
      password: null,
      setCredentials: (username: string, password: string): void => {
        set({ username, password });
      },
      clearCredentials: (): void => {
        set({ username: null, password: null });
      },
    }),
    {
      name: 'whatsapp-pwa-auth',
    }
  )
);
