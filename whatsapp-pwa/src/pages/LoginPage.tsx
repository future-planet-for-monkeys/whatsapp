import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { useClientState } from '../api/queries';
import { client } from '../api/client';
import LoadingSpinner from '../components/ui/LoadingSpinner';

export default function LoginPage(): React.ReactElement {
  const navigate = useNavigate();
  const {
    username,
    password,
    token,
    setCredentials,
    setToken,
    clearCredentials,
  } = useAuthStore();

  // Step 1 (System Auth) form state
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');

  // Step 2 (User Auth) form state
  const [isSignUp, setIsSignUp] = useState(false);
  const [userPhone, setUserPhone] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userName, setUserName] = useState('');
  const [userNotes, setUserNotes] = useState('');

  const [isChecking, setIsChecking] = useState(false);
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);

  const hasCredentials = !!username && !!password;
  const hasToken = !!token;
  const [refetchInterval, setRefetchInterval] = useState<number | false>(false);

  // We only poll client state if we have system credentials
  const { data, error, refetch } = useClientState({
    enabled: hasCredentials && !hasToken, // ⬅ stop polling once JWT is set (we'll navigate instead)
    refetchInterval,
  });

  useEffect(() => {
    if (data?.status === 'initializing') {
      setRefetchInterval(2000);
    } else {
      setRefetchInterval(false);
    }
  }, [data?.status]);

  // Handle successful authentication and status routing (ONLY navigate from /auth/me after token)
  useEffect(() => {
    if (hasToken && data) {
      setIsChecking(false);
      if (data.status === 'ready') {
        navigate('/chats');
      } else if (data.status === 'qr_ready') {
        navigate('/pair');
      }
    }
  }, [data, hasToken, navigate]);

  // Handle system authentication errors
  useEffect(() => {
    if (error && !hasToken) {
      toast.error('Invalid system credentials or connection error');
      clearCredentials();
      setIsChecking(false);
    }
  }, [error, hasToken, clearCredentials]);

  // Step 1: Submit System Credentials
  const handleSystemSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!formUsername.trim() || !formPassword.trim()) {
      toast.error('Please enter both system username and password');
      return;
    }

    setIsChecking(true);
    setCredentials(formUsername.trim(), formPassword.trim());
  };

  // Step 2: Submit User Credentials (Login or Signup)
  const handleUserSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    if (isSignUp) {
      if (!userName.trim() || !userPhone.trim() || !userPassword.trim()) {
        toast.error('Please fill in all required fields');
        return;
      }
    } else {
      if (!userPhone.trim() || !userPassword.trim()) {
        toast.error('Please enter both phone number and password');
        return;
      }
    }

    setIsSubmittingUser(true);

    try {
      let response;
      if (isSignUp) {
        response = await client.post<{ token: string; user: { userId: string; name: string } }>(
          '/auth/signup',
          {
            name: userName.trim(),
            phoneNumber: userPhone.trim(),
            password: userPassword.trim(),
            notes: userNotes.trim() || undefined,
          },
          { baseURL: '' },
        );
      } else {
        response = await client.post<{ token: string; user: { userId: string; name: string } }>(
          '/auth/login',
          {
            phoneNumber: userPhone.trim(),
            password: userPassword.trim(),
          },
          { baseURL: '' },
        );
      }

      const { token: jwt, user } = response.data;
      toast.success(`Logged in as ${user.name}`);

      // Store the token FIRST so the Axios interceptor uses it
      setToken(jwt, user);

      // Validate the JWT by calling /auth/me — if it fails we stay here
      try {
        await client.get('/auth/me', { baseURL: '' });
      } catch {
        toast.error('JWT validation failed — try again');
        useAuthStore.getState().clearToken();
        setIsSubmittingUser(false);
        return;
      }

      // JWT is valid — now refetch client state with Bearer token
      // (baseURL is /single, so /client/state resolves to /single/client/state)
      try {
        const clientState = await client.get('/client/state');
        const cs = clientState.data;
        if (cs.status === 'ready') {
          navigate('/chats');
        } else if (cs.status === 'qr_ready') {
          navigate('/pair');
        } else {
          // Unexpected status — let the user see it, refetch will poll
          refetch();
        }
      } catch {
        toast.error('Failed to check WhatsApp state — is the session connected?');
      }
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Authentication failed';
      toast.error(message);
    } finally {
      setIsSubmittingUser(false);
    }
  };

  const handleRetry = (): void => {
    refetch();
  };

  const handleSystemLogout = (): void => {
    clearCredentials();
    setFormUsername('');
    setFormPassword('');
    setIsChecking(false);
  };

  // 1. If we have system credentials but WhatsApp is disconnected
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
              onClick={handleSystemLogout}
              className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-md transition-colors min-h-[44px]"
            >
              Disconnect System
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. If we have system credentials but WhatsApp auth failed
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
              onClick={handleSystemLogout}
              className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-md transition-colors min-h-[44px]"
            >
              Disconnect System
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Step 1: System Authentication Form (if no system credentials)
  if (!hasCredentials) {
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
            <p className="text-gray-500 text-sm mt-1">Step 1: System Authentication</p>
          </div>

          <form onSubmit={handleSystemSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="username">
                System Username
              </label>
              <input
                id="username"
                type="text"
                value={formUsername}
                onChange={(e) => setFormUsername(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-whatsapp-teal focus:border-transparent min-h-[44px]"
                placeholder="Enter system username"
                disabled={isChecking}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">
                System Password
              </label>
              <input
                id="password"
                type="password"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-whatsapp-teal focus:border-transparent min-h-[44px]"
                placeholder="Enter system password"
                disabled={isChecking}
              />
            </div>

            <button
              type="submit"
              disabled={isChecking}
              className="w-full py-3 px-4 bg-whatsapp-teal hover:bg-whatsapp-teal-dark text-white font-medium rounded-md transition-colors disabled:opacity-50 flex items-center justify-center min-h-[44px]"
            >
              {isChecking ? <LoadingSpinner size="sm" className="mr-2" /> : null}
              {isChecking ? 'Verifying System...' : 'Connect to System'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 4. Step 2: User Authentication Form (if system credentials are valid but no user token)
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
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-whatsapp-teal">WhatsApp PWA</h1>
          <p className="text-gray-500 text-sm mt-1">
            {isSignUp ? 'Step 2: Register New User' : 'Step 2: User Sign-In'}
          </p>
        </div>

        <form onSubmit={handleUserSubmit} className="space-y-4">
          {isSignUp ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="userName">
                Full Name *
              </label>
              <input
                id="userName"
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-whatsapp-teal focus:border-transparent min-h-[44px]"
                placeholder="Enter your name"
                disabled={isSubmittingUser}
                required
              />
            </div>
          ) : null}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="userPhone">
              Phone Number *
            </label>
            <input
              id="userPhone"
              type="tel"
              value={userPhone}
              onChange={(e) => setUserPhone(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-whatsapp-teal focus:border-transparent min-h-[44px]"
              placeholder="e.g. 15551234567"
              disabled={isSubmittingUser}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="userPassword">
              Password *
            </label>
            <input
              id="userPassword"
              type="password"
              value={userPassword}
              onChange={(e) => setUserPassword(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-whatsapp-teal focus:border-transparent min-h-[44px]"
              placeholder="Enter password"
              disabled={isSubmittingUser}
              required
            />
          </div>

          {isSignUp ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="userNotes">
                Notes (Optional)
              </label>
              <textarea
                id="userNotes"
                value={userNotes}
                onChange={(e) => setUserNotes(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-whatsapp-teal focus:border-transparent min-h-[80px]"
                placeholder="Any notes about this user"
                disabled={isSubmittingUser}
              />
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmittingUser}
            className="w-full py-3 px-4 bg-whatsapp-teal hover:bg-whatsapp-teal-dark text-white font-medium rounded-md transition-colors disabled:opacity-50 flex items-center justify-center min-h-[44px]"
          >
            {isSubmittingUser ? <LoadingSpinner size="sm" className="mr-2" /> : null}
            {isSubmittingUser
              ? isSignUp
                ? 'Registering...'
                : 'Signing In...'
              : isSignUp
              ? 'Register User'
              : 'Sign In'}
          </button>

          <div className="flex items-center justify-between pt-2 text-sm">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-whatsapp-teal hover:underline font-medium min-h-[44px] px-2"
              disabled={isSubmittingUser}
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Register"}
            </button>

            <button
              type="button"
              onClick={handleSystemLogout}
              className="text-red-600 hover:underline font-medium min-h-[44px] px-2"
              disabled={isSubmittingUser}
            >
              Disconnect System
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
