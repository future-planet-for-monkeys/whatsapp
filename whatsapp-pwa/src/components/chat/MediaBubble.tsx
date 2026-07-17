import React, { useState, useEffect, useRef } from 'react';
import { useAuthedBlob } from '../../hooks/useAuthedBlob';
import { AllowedMessageTypes } from '../../api/types';
import LoadingSpinner from '../ui/LoadingSpinner';

interface MediaBubbleProps {
  messageId: string;
  type: AllowedMessageTypes;
  body: string;
  hasMedia: boolean;
}

export default function MediaBubble({
  messageId,
  type,
  body,
  hasMedia,
}: MediaBubbleProps): React.ReactElement {
  const [isInView, setIsInView] = useState<boolean>(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMedia || type === 'unsupported') return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' } // Trigger slightly before entering viewport
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [hasMedia, type]);

  const mediaUrl = isInView ? `/messages/${encodeURIComponent(messageId)}/media` : null;
  const { objectUrl, filename, isLoading, error } = useAuthedBlob(mediaUrl);

  if (!hasMedia) {
    return <span className="whitespace-pre-wrap break-words">{body}</span>;
  }

  if (type === 'unsupported') {
    return <span className="text-gray-500 italic">This message is not supported</span>;
  }

  const handleDownload = (): void => {
    if (!objectUrl) return;
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename || body || 'Document';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const renderMediaContent = (): React.ReactNode => {
    if (!isInView) {
      return (
        <div className="flex items-center justify-center w-48 h-32 bg-gray-100 rounded animate-pulse">
          <span className="text-xs text-gray-400">Loading...</span>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="flex items-center justify-center w-48 h-32 bg-gray-100 rounded">
          <LoadingSpinner size="sm" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center w-48 h-32 bg-red-50 rounded p-2 text-center">
          <span className="text-xs text-red-500 font-semibold">Failed to load media</span>
          <span className="text-[10px] text-red-400 mt-1 break-all">{error.message}</span>
        </div>
      );
    }

    if (!objectUrl) return null;

    switch (type) {
      case 'image':
        return (
          <>
            <img
              src={objectUrl}
              alt={body || 'Image'}
              className="max-w-full max-h-60 rounded cursor-pointer hover:opacity-95 transition-opacity object-cover"
              onClick={() => setIsLightboxOpen(true)}
            />
            {isLightboxOpen && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-4"
                onClick={() => setIsLightboxOpen(false)}
              >
                <img
                  src={objectUrl}
                  alt={body || 'Image'}
                  className="max-w-full max-h-full object-contain"
                />
                <button
                  className="absolute top-4 right-4 text-white text-2xl font-bold bg-gray-800 bg-opacity-50 rounded-full w-11 h-11 flex items-center justify-center hover:bg-opacity-75 min-w-[44px] min-h-[44px]"
                  onClick={() => setIsLightboxOpen(false)}
                >
                  &times;
                </button>
              </div>
            )}
          </>
        );

      case 'sticker':
        return (
          <img
            src={objectUrl}
            alt="Sticker"
            className="w-32 h-32 object-contain bg-transparent"
          />
        );

      case 'video':
        return (
          <video
            controls
            src={objectUrl}
            className="max-w-full max-h-60 rounded"
          />
        );

      case 'ptt':
        return (
          <div className="flex items-center space-x-2 py-1">
            <span className="text-lg">🎤</span>
            <audio
              controls
              src={objectUrl}
              className="max-w-full h-8"
            />
          </div>
        );

      case 'audio':
        return (
          <div className="flex items-center space-x-2 py-1">
            <span className="text-lg">🎵</span>
            <audio
              controls
              src={objectUrl}
              className="max-w-full h-8"
            />
          </div>
        );

      case 'document':
        return (
          <div className="flex items-center justify-between bg-black bg-opacity-5 p-3 rounded-lg border border-black border-opacity-10 max-w-xs">
            <div className="flex items-center space-x-3 min-w-0 mr-4">
              <span className="text-2xl flex-shrink-0">📄</span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {filename || body || 'Document'}
                </p>
                <p className="text-xs text-gray-500">Document</p>
              </div>
            </div>
            <button
              onClick={handleDownload}
              className="flex-shrink-0 bg-whatsapp-teal text-white hover:bg-opacity-90 p-3 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              title="Download"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
            </button>
          </div>
        );

      default:
        return <span className="text-gray-500 italic">Unsupported media type</span>;
    }
  };

  return (
    <div ref={containerRef} className="max-w-full">
      {renderMediaContent()}
    </div>
  );
}
