import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';

/**
 * Format a Unix epoch-seconds timestamp into a relative or absolute time string
 * suitable for chat list rows (e.g. "12:30", "Yesterday", "Mon", "15/06/2024").
 */
export function formatChatTime(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const now = new Date();

  if (isToday(date)) {
    return format(date, 'HH:mm');
  }

  if (isYesterday(date)) {
    return 'Yesterday';
  }

  // Within the last 7 days — show weekday name
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 7) {
    return format(date, 'EEEE');
  }

  // Older — show date
  return format(date, 'dd/MM/yyyy');
}

/**
 * Format a Unix epoch-seconds timestamp into a full time string for message bubbles
 * (e.g. "12:30").
 */
export function formatMessageTime(timestamp: number): string {
  return format(new Date(timestamp * 1000), 'HH:mm');
}

/**
 * Format a Unix epoch-seconds timestamp into a date header for chat views
 * (e.g. "Today", "Yesterday", "Monday, 15 June 2024").
 */
export function formatMessageDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);

  if (isToday(date)) {
    return 'Today';
  }

  if (isYesterday(date)) {
    return 'Yesterday';
  }

  return format(date, 'EEEE, d MMMM yyyy');
}

/**
 * Format a relative time string for tooltips or accessibility labels.
 */
export function formatRelativeTime(timestamp: number): string {
  return formatDistanceToNow(new Date(timestamp * 1000), { addSuffix: true });
}

/**
 * Truncate a string to a maximum length, appending "..." if truncated.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}…`;
}

/**
 * Format a phone number for display, preserving readability.
 * Strips @c.us suffix, formats as +X (XXX) XXX-XXXX if possible.
 */
export function formatPhoneNumber(raw: string): string {
  const number = raw.replace(/@c\.us$/, '').replace(/@g\.us$/, '');
  if (number.length >= 10) {
    const country = number.slice(0, number.length - 10);
    const area = number.slice(number.length - 10, number.length - 7);
    const prefix = number.slice(number.length - 7, number.length - 4);
    const line = number.slice(number.length - 4);
    return `+${country} (${area}) ${prefix}-${line}`;
  }
  return `+${number}`;
}