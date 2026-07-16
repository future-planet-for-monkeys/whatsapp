import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useStatus } from '../api/queries';

/**
 * Hook that provides login/logout actions and the current auth state.
 */
export function useAuth(): {
  isAuthenticated: boolean;
  login: (username: string, password: string) => void;
  logout: () => void;
  status: ReturnType<typeof useStatus>;
} {
  const navigate = useNavigate();
  const { setCredentials, clearCredentials, isAuthenticated } = useAuthStore();
  const status = useStatus();

  const login = useCallback(
    (username: string, password: string): void => {
      setCredentials(username, password);
      // The status query will automatically refetch with the new credentials
      // and the App component will handle the redirect based on the status.
      navigate('/');
    },
    [setCredentials, navigate],
  );

  const logout = useCallback((): void => {
    clearCredentials();
    navigate('/login');
  }, [clearCredentials, navigate]);

  return {
    isAuthenticated: isAuthenticated(),
    login,
    logout,
    status,
  };
}