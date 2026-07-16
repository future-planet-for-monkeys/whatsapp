import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStatus } from '../api/queries';
import { QRScanner } from '../components/auth/QRScanner';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

/**
 * QR code scanning page.
 * Shows the QR code for linking a WhatsApp session.
 * Redirects to /chats once the client is ready.
 */
export function QRPage(): JSX.Element {
  const navigate = useNavigate();
  const { data: statusData, isLoading, isError } = useStatus();

  const handleReady = (): void => {
    navigate('/chats', { replace: true });
  };

  // If already ready, redirect immediately
  useEffect(() => {
    if (statusData?.ready) {
      navigate('/chats', { replace: true });
    }
  }, [statusData, navigate]);

  // ── Loading state ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-whatsapp-primary flex items-center justify-center">
        <LoadingSpinner message="Connecting to WhatsApp..." size="lg" />
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="min-h-screen bg-whatsapp-primary flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-sm w-full">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Connection Error</h2>
          <p className="text-sm text-gray-500 mb-4">
            Failed to check WhatsApp status. Please try again.
          </p>
          <button
            onClick={(): void => window.location.reload()}
            className="px-6 py-2 bg-whatsapp-primary text-white rounded-lg hover:bg-whatsapp-secondary transition-colors min-h-touch"
            type="button"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ── QR page ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f0f2f5] flex flex-col relative overflow-hidden">
      {/* Decorative background top bar */}
      <div className="absolute top-0 left-0 right-0 h-[222px] bg-[#00a884] z-0" />

      {/* Header */}
      <div className="text-white px-6 py-4 flex items-center gap-4 h-[60px] z-10 max-w-5xl mx-auto w-full mt-4">
        <button
          onClick={(): void => navigate('/login')}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors min-w-touch min-h-touch"
          type="button"
          aria-label="Back"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-semibold">Link Device</h1>
          <p className="text-xs text-white/80">
            Status: {statusData?.status ?? 'unknown'}
          </p>
        </div>
      </div>

      {/* QR Scanner */}
      <div className="flex-1 flex items-center justify-center p-4 z-10">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-lg w-full border border-gray-200/50">
          <QRScanner onReady={handleReady} />
        </div>
      </div>
    </div>
  );
}