import { isToday, isYesterday, isThisWeek, format } from 'date-fns';
import { MessageDto } from '../api/types';

/**
 * Formats a UNIX timestamp (in seconds) into a date separator string:
 * - Today: "Today"
 * - Yesterday: "Yesterday"
 * - This week: Weekday name (e.g., Monday)
 * - Older: dd MMMM yyyy (e.g., 17 July 2026)
 */
export function formatMessageDateSeparator(timestampSeconds: number): string {
  const date = new Date(timestampSeconds * 1000);
  if (isToday(date)) {
    return 'Today';
  }
  if (isYesterday(date)) {
    return 'Yesterday';
  }
  if (isThisWeek(date, { weekStartsOn: 1 })) {
    return format(date, 'eeee');
  }
  return format(date, 'dd MMMM yyyy');
}

/**
 * Formats a UNIX timestamp (in seconds) into a relative string:
 * - Today: HH:mm
 * - This week: Weekday name (e.g., Monday)
 * - Older: dd/MM/yyyy
 */
export function formatChatTimestamp(timestampSeconds: number | null | undefined): string {
  if (timestampSeconds == null || timestampSeconds <= 0) {
    return '';
  }
  const date = new Date(timestampSeconds * 1000);
  if (isNaN(date.getTime())) {
    return '';
  }
  if (isToday(date)) {
    return format(date, 'HH:mm');
  }
  if (isThisWeek(date, { weekStartsOn: 1 })) {
    return format(date, 'eeee');
  }
  return format(date, 'dd/MM/yyyy');
}

/**
 * Returns a user-friendly preview string for a message based on its type.
 */
export function getMessagePreview(lastMessage: MessageDto | null): string {
  if (!lastMessage) {
    return '';
  }
  switch (lastMessage.type) {
    case 'chat':
      return lastMessage.body;
    case 'image':
      return '📷 Photo';
    case 'video':
      return '🎥 Video';
    case 'ptt':
      return '🎤 Voice message';
    case 'audio':
      return '🎵 Audio';
    case 'document':
      return '📄 Document';
    case 'sticker':
      return 'Sticker';
    case 'unsupported':
    default:
      return '';
  }
}
