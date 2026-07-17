import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { useClientState } from '../api/queries';
import LoadingSpinner from '../components/ui/LoadingSpinner';

export default function LoginPage(): React.ReactElement {
  const navigate = useNavigate();
  const { username, password, setCredentials, clearCredentials } = useAuthStore();

  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  const hasCredentials = !!username && !!password;
  const [refetchInterval, setRefetchInterval] = useState<number | false>(false);

  const { data, error, refetch } = useClientState({
    enabled: hasCredentials,
    refetchInterval,
  });

  useEffect(() => {
    if (data?.status === 'initializing') {
      setRefetchInterval(2000);
    } else {
      setRefetchInterval(false);
    }
  }, [data?.status]);

  // Handle successful authentication and status routing
  useEffect(() => {
    if (data) {
      setIsChecking(false);
      if (data.status === 'ready') {
        navigate('/chats');
      } else if (data.status === 'qr_ready') {
        navigate('/pair');
      }
    }
  }, [data, navigate]);

  // Handle authentication or connection errors
  useEffect(() => {
    if (error) {
      toast.error('Invalid credentials or connection error');
      clearCredentials();
      setIsChecking(false);
    }
  }, [error, clearCredentials]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!formUsername.trim() || !formPassword.trim()) {
      toast.error('Please enter both username and password');
      return;
    }

    setIsChecking(true);
    setCredentials(formUsername.trim(), formPassword.trim());
  };

  const handleRetry = (): void => {
    refetch();
  };

  const handleLogout = (): void => {
    clearCredentials();
    setFormUsername('');
    setFormPassword('');
    setIsChecking(false);
  };

  // If we have credentials and are checking/polling
  if (hasCredentials && (isChecking || data?.status === 'initializing')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md text-center">
          <LoadingSpinner size="lg" className="mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Connecting to WhatsApp</h2>
          <p className="text-gray-600 text-sm mb-4">
            {data?.status === 'initializing'
              ? 'Initializing WhatsApp session...'
              : 'Verifying credentials...'}
          </p>
          <button
            onClick={handleLogout}
            className="text-sm text-red-600 hover:text-red-800 font-medium min-h-[44px] px-4 py-2"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // If WhatsApp is disconnected
  if (hasCredentials && data?.status === 'disconnected') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">WhatsApp Disconnected</h2>
          <p className="text-gray-600 text-sm mb-6">
            The WhatsApp client is disconnected. Please make sure your phone has an active internet connection.
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={handleRetry}
              className="w-full py-3 px-4 bg-whatsapp-teal hover:bg-whatsapp-teal-dark text-white font-medium rounded-md transition-colors min-h-[44px]"
            >
              Retry Connection
            </button>
            <button
              onClick={handleLogout}
              className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-md transition-colors min-h-[44px]"
            >
              Log Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If WhatsApp auth failed
  if (hasCredentials && data?.status === 'auth_failure') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">WhatsApp Auth Failed</h2>
          <p className="text-gray-600 text-sm mb-6">
            The WhatsApp session authentication failed. You may need to pair your device again.
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={handleRetry}
              className="w-full py-3 px-4 bg-whatsapp-teal hover:bg-whatsapp-teal-dark text-white font-medium rounded-md transition-colors min-h-[44px]"
            >
              Retry Connection
            </button>
            <button
              onClick={handleLogout}
              className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-md transition-colors min-h-[44px]"
            >
              Log Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 bg-whatsapp-teal rounded-full flex items-center justify-center mb-2">
            <svg
              className="w-8 h-8 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.739-1.456L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.413 9.863-9.83.001-2.624-1.023-5.091-2.884-6.953C16.588 1.96 14.118.935 11.998.935c-5.444 0-9.866 4.41-9.87 9.828-.001 1.702.451 3.361 1.307 4.8l-.988 3.606 3.61-.947zm12.44-6.18c-.1-.167-.369-.266-.773-.467-.404-.2-2.384-1.177-2.754-1.31-.37-.134-.64-.2-.909.2-.269.4-.1.909-.134 1.04-.034.134-.068.267-.269.467-.2.2-.801.663-1.527 1.31-.565.504-1.04.8-1.444 1.001-.404.2-.673.267-.942.067-.27-.2-1.213-1.41-1.52-1.684-.306-.274-.51-.1-.712.1-.2.2-.404.467-.606.7-.2.234-.404.267-.808.067-.404-.2-1.707-.63-3.252-2.007-1.2-1.07-2.01-2.392-2.246-2.793-.236-.4-.025-.616.177-.815.18-.18.404-.467.606-.7.202-.234.269-.4.404-.667.135-.267.067-.501-.034-.7-.1-.2-.909-2.187-1.246-2.989-.328-.789-.656-.681-.909-.693-.234-.012-.504-.015-.773-.015-.27 0-.707.1-1.078.5-.37.4-1.413 1.382-1.413 3.37 0 1.987 1.447 3.908 1.649 4.175.202.267 2.847 4.348 6.9 6.09 1.01.435 1.8.695 2.414.889 1.014.322 1.937.277 2.667.168.813-.122 2.49-.98 2.84-1.926.35-.946.35-1.757.246-1.926z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-whatsapp-teal">WhatsApp PWA</h1>
          <p className="text-gray-500 text-sm mt-1">Enter your API credentials to log in</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={formUsername}
              onChange={(e) => setFormUsername(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-whatsapp-teal focus:border-transparent min-h-[44px]"
              placeholder="Enter username"
              disabled={isChecking}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={formPassword}
              onChange={(e) => setFormPassword(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-whatsapp-teal focus:border-transparent min-h-[44px]"
              placeholder="Enter password"
              disabled={isChecking}
            />
          </div>

          <button
            type="submit"
            disabled={isChecking}
            className="w-full py-3 px-4 bg-whatsapp-teal hover:bg-whatsapp-teal-dark text-white font-medium rounded-md transition-colors disabled:opacity-50 flex items-center justify-center min-h-[44px]"
          >
            {isChecking ? <LoadingSpinner size="sm" className="mr-2" /> : null}
            {isChecking ? 'Logging in...' : 'Log In'}
          </button>
        </form>
      </div>
    </div>
  );
}
