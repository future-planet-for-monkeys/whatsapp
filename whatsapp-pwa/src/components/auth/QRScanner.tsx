import { useQrCode, useStatus } from '../../api/queries';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import type { AxiosError } from 'axios';

export interface QRScannerProps {
  /** Called when the client becomes ready */
  onReady: () => void;
}

/**
 * Displays the WhatsApp QR code for scanning.
 * Polls GET /qr every 1s and GET /status to detect transition to ready.
 *
 * Handles 409 (QR not available yet) gracefully:
 * - If status is `ready` → redirect to chats
 * - If status is `initializing`/`authenticated` → waiting message
 * - If status is `qr_ready` → should have a QR code (re-fetch)
 */
export function QRScanner({ onReady }: QRScannerProps): JSX.Element {
  const { data: statusData } = useStatus();
  const { data: qrData, isLoading, error, refetch } = useQrCode();

  // When status becomes ready, notify parent
  if (statusData?.ready) {
    onReady();
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <LoadingSpinner message="Loading QR code..." size="lg" />
      </div>
    );
  }

  // ── Handle 409 / QR not available ──────────────────────────────────────
  if (error) {
    const axiosError = error as AxiosError;
    const is409 = axiosError?.response?.status === 409;

    if (is409) {
      // QR is not available yet — show status-appropriate message
      const status = statusData?.status ?? 'unknown';

      if (status === 'initializing') {
        return (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <LoadingSpinner message="Initializing WhatsApp client..." size="lg" />
            <p className="text-sm text-gray-500 mt-4">
              Please wait while the connection is established
            </p>
          </div>
        );
      }

      if (status === 'authenticated') {
        return (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <LoadingSpinner message="Authenticated, loading data..." size="lg" />
            <p className="text-sm text-gray-500 mt-4">
              WhatsApp is syncing your chats
            </p>
          </div>
        );
      }

      if (status === 'disconnected' || status === 'auth_failure') {
        return (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <p className="text-gray-700 font-medium mb-2">Connection issue</p>
            <p className="text-sm text-gray-500 mb-4">
              Status: {status}. The client may need to reconnect.
            </p>
            <button
              onClick={(): void => { refetch(); }}
              className="px-6 py-2.5 bg-[#008069] text-white rounded-md hover:bg-[#005e4b] transition-colors min-h-touch font-medium shadow-sm"
              type="button"
            >
              Retry
            </button>
          </div>
        );
      }

      // Default waiting state (qr_ready should have a QR code, but if not)
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <LoadingSpinner message="Waiting for QR code..." size="lg" />
          <p className="text-sm text-gray-500 mt-4">
            Status: {status}
          </p>
        </div>
      );
    }

    // Non-409 error (network error, 5xx, etc.)
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <p className="text-red-500 mb-4">Failed to load QR code</p>
        <p className="text-sm text-gray-500 mb-4">
          {error instanceof Error ? error.message : 'Unknown error'}
        </p>
        <button
          onClick={(): void => { refetch(); }}
          className="px-6 py-2.5 bg-[#008069] text-white rounded-md hover:bg-[#005e4b] transition-colors min-h-touch font-medium shadow-sm"
          type="button"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!qrData?.qr) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <p className="text-gray-500">QR code not available yet</p>
        <LoadingSpinner message="Waiting for QR code..." size="sm" className="mt-4" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-2">
      <h2 className="text-xl font-semibold text-gray-800 mb-2">Scan QR Code</h2>
      <p className="text-sm text-gray-500 mb-6 text-center max-w-sm">
        Open WhatsApp on your phone, tap Menu or Settings, select Linked Devices, and scan the QR code to link your session.
      </p>
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100" style={{ maxWidth: 300 }}>
        <img
          src={qrData.qr}
          alt="WhatsApp QR Code"
          className="w-full h-auto"
          style={{ maxWidth: 280, maxHeight: 280 }}
        />
      </div>
      <p className="text-xs text-gray-400 mt-4 text-center">
        The QR code refreshes every 30 seconds
      </p>
      <button
        onClick={(): void => { refetch(); }}
        className="mt-6 px-6 py-2.5 bg-[#008069] text-white rounded-md hover:bg-[#005e4b] transition-colors min-h-touch font-medium shadow-sm"
        type="button"
      >
        Refresh QR Code
      </button>
    </div>
  );
}