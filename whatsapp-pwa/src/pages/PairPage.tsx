import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useClientState } from '../api/queries';
import LoadingSpinner from '../components/ui/LoadingSpinner';

export default function PairPage(): React.ReactElement {
  const navigate = useNavigate();
  const { username, password, clearCredentials } = useAuthStore();

  const hasCredentials = !!username && !!password;

  // Redirect to login if no credentials
  useEffect(() => {
    if (!hasCredentials) {
      navigate('/login');
    }
  }, [hasCredentials, navigate]);

  const { data, isLoading, error } = useClientState({
    enabled: hasCredentials,
    refetchInterval: 2000, // Poll every 2s
  });

  // Automatically navigate to chats when ready
  useEffect(() => {
    if (data?.status === 'ready') {
      navigate('/chats');
    }
  }, [data?.status, navigate]);

  const handleLogout = (): void => {
    clearCredentials();
    navigate('/login');
  };

  if (!hasCredentials) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md text-center">
          <LoadingSpinner size="lg" className="mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Loading WhatsApp Status</h2>
          <p className="text-gray-600 text-sm">Checking connection status...</p>
        </div>
      </div>
    );
  }

  if (error) {
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
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Connection Error</h2>
          <p className="text-gray-600 text-sm mb-6">
            Failed to connect to the server. Please check your credentials or server status.
          </p>
          <button
            onClick={handleLogout}
            className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-md transition-colors min-h-[44px]"
          >
            Log Out
          </button>
        </div>
      </div>
    );
  }

  const showQR = data?.qrAvailable && data?.qrDataURL;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md text-center">
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
          <h1 className="text-2xl font-bold text-whatsapp-teal">Pair WhatsApp</h1>
          <p className="text-gray-500 text-sm mt-1">Scan the QR code with WhatsApp on your phone</p>
        </div>

        <div className="flex flex-col items-center justify-center min-h-[300px] border-2 border-dashed border-gray-200 rounded-lg p-4 mb-6 bg-gray-50">
          {showQR ? (
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <img
                src={data.qrDataURL!}
                alt="WhatsApp QR Code"
                className="w-full max-w-[260px] h-auto mx-auto"
              />
              <p className="text-xs text-gray-400 mt-2">QR codes rotate automatically</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <LoadingSpinner size="md" className="mb-3" />
              <p className="text-gray-600 font-medium">Waiting for WhatsApp...</p>
              <p className="text-xs text-gray-400 mt-1">Generating QR code, please wait</p>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="text-xs text-gray-500 text-left bg-blue-50 p-3 rounded-md border border-blue-100">
            <p className="font-semibold text-blue-800 mb-1">Instructions:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Open WhatsApp on your phone.</li>
              <li>Tap Menu or Settings and select Linked Devices.</li>
              <li>Tap on Link a Device.</li>
              <li>Point your phone to this screen to capture the code.</li>
            </ol>
          </div>

          <button
            onClick={handleLogout}
            className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-md transition-colors min-h-[44px]"
          >
            Log Out / Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
