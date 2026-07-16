import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthCredentials {
  username: string;
  password: string;
}

export interface AuthState {
  /** Stored Basic Auth credentials (null = not authenticated) */
  credentials: AuthCredentials | null;
  /** Set credentials after successful login */
  setCredentials: (username: string, password: string) => void;
  /** Clear credentials on logout / 401 */
  clearCredentials: () => void;
  /** Check if the user is authenticated */
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      credentials: null,
      setCredentials: (username: string, password: string): void => {
        set({ credentials: { username, password } });
      },
      clearCredentials: (): void => {
        set({ credentials: null });
      },
      isAuthenticated: (): boolean => {
        return get().credentials !== null;
      },
    }),
    {
      name: 'whatsapp-auth',
      partialize: (state: AuthState): Partial<AuthState> => ({
        credentials: state.credentials,
      }),
    },
  ),
);