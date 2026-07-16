import { useState, useEffect, useRef } from 'react';
import { fetchAvatar } from '../../api/queries';

export interface AvatarProps {
  /** WhatsApp contact ID used to fetch the avatar */
  contactId: string;
  /** Display name for initials fallback */
  name: string;
  /** Size in pixels (default 40) */
  size?: number;
  /** Optional CSS class override */
  className?: string;
}

/**
 * Lazy-loading avatar component.
 *
 * Tries to fetch the avatar from GET /contacts/{contactId}/avatar.
 * Falls back to a coloured initials circle on 404/error.
 * Never blocks rendering — always shows something immediately.
 */
export function Avatar({ contactId, name, size = 40, className = '' }: AvatarProps): JSX.Element {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<boolean>(false);
  const mountedRef = useRef<boolean>(true);

  useEffect(() => {
    mountedRef.current = true;
    setAvatarUrl(null);
    setLoadError(false);

    let cancelled = false;

    (async (): Promise<void> => {
      try {
        const url = await fetchAvatar(contactId);
        if (!cancelled && mountedRef.current) {
          if (url) {
            setAvatarUrl(url);
          } else {
            setLoadError(true);
          }
        }
      } catch {
        if (!cancelled && mountedRef.current) {
          setLoadError(true);
        }
      }
    })();

    return (): void => {
      cancelled = true;
      mountedRef.current = false;
      if (avatarUrl) {
        URL.revokeObjectURL(avatarUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId]);

  // Generate a deterministic colour from the contact ID
  const colours = [
    '#25d366', '#128c7e', '#075e54', '#dcf8c6',
    '#34b7f1', '#00bfa5', '#4a5f70', '#7f8c8d',
  ];
  const colourIndex = contactId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % colours.length;
  const bgColour = colours[colourIndex] ?? '#075e54';

  // Get initials from name
  const initials = name
    ? name
        .split(' ')
        .map((part: string): string => part.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('')
    : '?';

  const fontSize = Math.max(size * 0.4, 12);

  if (avatarUrl && !loadError) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        width={size}
        height={size}
        className={`rounded-full object-cover flex-shrink-0 ${className}`}
        style={{ width: size, height: size }}
        onError={(): void => setLoadError(true)}
      />
    );
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: bgColour,
        fontSize,
      }}
      aria-label={name}
    >
      {initials || '?'}
    </div>
  );
}