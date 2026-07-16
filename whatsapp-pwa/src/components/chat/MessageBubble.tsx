import { useState } from 'react';
import type { MessageItem } from '../../api/types';
import { formatMessageTime } from '../../utils/formatters';
import { getMediaDownloadUrl } from '../../api/queries';
import {
  isImageMime,
  isVideoMime,
  isAudioMime,
  isVoiceNote,
  isPdfMime,
  getMediaLabel,
} from '../../utils/mediaHelpers';

export interface MessageBubbleProps {
  message: MessageItem;
  /** Whether to show the author name (for group messages) */
  showAuthor?: boolean;
}

/**
 * Renders a single message bubble.
 * Handles text, image, video, audio/PTT, document/PDF, and other media types.
 * No ack/checkmark icons (out of scope).
 */
export function MessageBubble({ message, showAuthor = false }: MessageBubbleProps): JSX.Element {
  const [mediaError, setMediaError] = useState<boolean>(false);

  const isOutgoing = message.fromMe;
  const bubbleClass = isOutgoing
    ? 'bg-[#d9fdd3] self-end rounded-tr-none'
    : 'bg-white self-start rounded-tl-none';

  const mediaUrl = message.hasMedia ? getMediaDownloadUrl(message.id) : null;

  /**
   * Render the media content based on type and MIME type.
   */
  const renderMedia = (): JSX.Element | null => {
    if (!message.hasMedia || !mediaUrl) return null;
    if (mediaError) return renderMediaFallback();

    const mimeType = message.mimeType ?? '';
    const filename = message.filename;

    // Image
    if (isImageMime(mimeType)) {
      return (
        <div className="mb-1 rounded-lg overflow-hidden">
          <img
            src={mediaUrl}
            alt={filename ?? 'Image'}
            className="max-w-full h-auto rounded-lg cursor-pointer"
            style={{ maxHeight: 300 }}
            onClick={(): void => {
              window.open(mediaUrl, '_blank');
            }}
            onError={(): void => setMediaError(true)}
          />
        </div>
      );
    }

    // Video
    if (isVideoMime(mimeType)) {
      return (
        <div className="mb-1">
          <video
            controls
            className="max-w-full rounded-lg"
            style={{ maxHeight: 300 }}
            onError={(): void => setMediaError(true)}
          >
            <source src={mediaUrl} type={mimeType} />
          </video>
        </div>
      );
    }

    // Audio / Voice note (PTT)
    if (isAudioMime(mimeType) || isVoiceNote(message.type, mimeType)) {
      return (
        <div className="mb-1 py-2">
          <audio controls className="w-full max-w-[250px]" onError={(): void => setMediaError(true)}>
            <source src={mediaUrl} type={mimeType || 'audio/mpeg'} />
          </audio>
        </div>
      );
    }

    // Document / PDF
    if (isPdfMime(mimeType)) {
      return (
        <div className="mb-1">
          <a
            href={mediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <span className="text-2xl">📄</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-whatsapp-primary truncate">
                {filename ?? 'Document'}
              </p>
              <p className="text-xs text-gray-500">PDF — View</p>
            </div>
          </a>
        </div>
      );
    }

    // Other documents / fallback
    return (
      <div className="mb-1">
        <a
          href={mediaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <span className="text-2xl">📎</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-whatsapp-primary truncate">
              {filename ?? getMediaLabel(mimeType)}
            </p>
            <p className="text-xs text-gray-500">Download</p>
          </div>
        </a>
      </div>
    );
  };

  /**
   * Fallback when media fails to load.
   */
  const renderMediaFallback = (): JSX.Element => {
    const filename = message.filename ?? 'Media file';
    return (
      <div className="mb-1">
        <a
          href={mediaUrl ?? '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 p-2 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
        >
          <span className="text-2xl">⚠️</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-red-600 truncate">{filename}</p>
            <p className="text-xs text-red-400">Failed to load — tap to open</p>
          </div>
        </a>
      </div>
    );
  };

  return (
    <div className={`flex flex-col max-w-[85%] sm:max-w-[75%] mb-1 ${isOutgoing ? 'items-end self-end' : 'items-start self-start'}`}>
      {/* Author name for group messages */}
      {showAuthor && !isOutgoing && message.author && (
        <span className="text-xs text-[#128c7e] font-semibold mb-0.5 ml-2">
          {message.author}
        </span>
      )}

      <div className={`${bubbleClass} rounded-xl px-3 py-1.5 shadow-sm relative border border-black/[0.03]`}>
        {/* Media content */}
        {renderMedia()}

        {/* Message text body */}
        {message.body && (
          <p className="text-[14.5px] text-gray-900 whitespace-pre-wrap break-words leading-relaxed">
            {message.body}
          </p>
        )}

        {/* Timestamp */}
        <div className="flex items-center justify-end gap-1 mt-1">
          <span className="text-[10px] text-gray-500 font-medium">
            {formatMessageTime(message.timestamp)}
          </span>
        </div>
      </div>
    </div>
  );
}