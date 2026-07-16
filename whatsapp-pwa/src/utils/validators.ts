/**
 * Validate that a string is a non-empty phone number (digits only, after stripping
 * non-digit characters). Returns the cleaned digits or null if invalid.
 */
export function validatePhoneNumber(input: string): string | null {
  const cleaned = input.replace(/\D/g, '');
  if (cleaned.length === 0) return null;
  return cleaned;
}

/**
 * Validate that a message body is non-empty and not only whitespace.
 */
export function validateMessageBody(body: string): boolean {
  return body.trim().length > 0;
}

/**
 * Validate that credentials are non-empty strings.
 */
export function validateCredentials(username: string, password: string): boolean {
  return username.trim().length > 0 && password.length > 0;
}

/**
 * Validate that a file is within the maximum allowed size (64 MB).
 */
export function validateFileSize(file: File, maxBytes: number = 64 * 1024 * 1024): boolean {
  return file.size <= maxBytes;
}

/**
 * Basic email-like validation for a username field.
 * Accepts alphanumeric, underscore, dot, and hyphen.
 */
export function validateUsername(username: string): boolean {
  return /^[a-zA-Z0-9_.-]+$/.test(username);
}