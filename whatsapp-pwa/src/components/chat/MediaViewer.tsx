import { useEffect, useState } from 'react';
import { getMediaDownloadUrl } from '../../api/queries';
import { LoadingSpinner } from '../ui/LoadingSpinner';

export interface MediaViewerProps {
  messageId: string;
  mimeType: string;
  filename?: string;
  onClose: () => void;
}

/**
 * Full-screen media lightbox for images and videos.
 * Opens when a user taps on an image or video in a message bubble.
 */
export function MediaViewer({ messageId, mimeType, filename, onClose }: MediaViewerProps): JSX.Element {
  const [loaded, setLoaded] = useState<boolean>(false);
  const mediaUrl = getMediaDownloadUrl(messageId);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return (): void => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const isVideo = mimeType.startsWith('video/');

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-label="Media viewer"
    >
      <div className="relative max-w-full max-h-full" onClick={(e): void => e.stopPropagation()}>
        {!loaded && (
          <div className="flex items-center justify-center p-8">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {isVideo ? (
          <video
            controls
            autoPlay
            className={`max-w-full max-h-[90vh] rounded-lg ${loaded ? '' : 'hidden'}`}
            onLoadedData={(): void => setLoaded(true)}
          >
            <source src={mediaUrl} type={mimeType} />
          </video>
        ) : (
          <img
            src={mediaUrl}
            alt={filename ?? 'Media'}
            className={`max-w-full max-h-[90vh] rounded-lg object-contain ${loaded ? '' : 'hidden'}`}
            onLoad={(): void => setLoaded(true)}
          />
        )}

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 w-10 h-10 flex items-center justify-center bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors min-w-touch min-h-touch"
          type="button"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}