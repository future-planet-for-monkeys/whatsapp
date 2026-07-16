/**
 * Determine if a MIME type is an image.
 */
export function isImageMime(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

/**
 * Determine if a MIME type is a video.
 */
export function isVideoMime(mimeType: string): boolean {
  return mimeType.startsWith('video/');
}

/**
 * Determine if a MIME type is audio (including voice notes / PTT).
 */
export function isAudioMime(mimeType: string): boolean {
  return mimeType.startsWith('audio/');
}

/**
 * Determine if a MIME type is a PDF document.
 */
export function isPdfMime(mimeType: string): boolean {
  return mimeType === 'application/pdf';
}

/**
 * Determine if a message type is a "ptt" (push-to-talk / voice note).
 */
export function isVoiceNote(messageType: string, mimeType?: string): boolean {
  if (messageType === 'ptt') return true;
  if (mimeType && mimeType.startsWith('audio/ogg')) return true;
  return false;
}

/**
 * Get a human-readable label for a media type, used for download buttons or
 * fallback display when inline rendering is not possible.
 */
export function getMediaLabel(mimeType: string, filename?: string): string {
  if (isImageMime(mimeType)) return 'Image';
  if (isVideoMime(mimeType)) return 'Video';
  if (isAudioMime(mimeType)) return 'Audio';
  if (isPdfMime(mimeType)) return 'PDF';
  return filename ?? 'File';
}

/**
 * Get the file extension from a filename or MIME type.
 */
export function getFileExtension(mimeType: string, filename?: string): string {
  if (filename) {
    const parts = filename.split('.');
    if (parts.length > 1) return parts[parts.length - 1] ?? '';
  }
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'video/mp4': 'mp4',
    'audio/mpeg': 'mp3',
    'audio/ogg': 'ogg',
    'audio/mp4': 'm4a',
    'application/pdf': 'pdf',
  };
  return map[mimeType] ?? 'bin';
}