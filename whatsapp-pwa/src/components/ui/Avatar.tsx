import React, { useState, useEffect, useRef } from 'react';
import { ContactInfoDto } from '../../api/types';
import { useLazyAvatar } from '../../api/queries';

interface AvatarProps {
  contact: ContactInfoDto | null;
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function Avatar({ contact, name, size = 'md' }: AvatarProps): React.ReactElement {
  const [isInViewport, setIsInViewport] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const hasDirectUrl = !!contact?.avatarUrl;
  const lid = contact?.lid ?? null;

  useEffect(() => {
    if (hasDirectUrl || !lid) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsInViewport(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' } // Start loading slightly before it enters the viewport
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [hasDirectUrl, lid]);

  // Fetch avatar lazily if direct URL is missing but lid is present and in viewport
  const { data: lazyAvatarUrl, isError } = useLazyAvatar(lid, {
    enabled: !hasDirectUrl && !!lid && isInViewport,
  });

  const finalSrc = contact?.avatarUrl || lazyAvatarUrl || null;

  // Initials fallback
  const getInitials = (str: string): string => {
    const trimmed = str.trim();
    if (!trimmed) return '?';
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) {
      const first = parts[0]?.[0] || '';
      const second = parts[1]?.[0] || '';
      return (first + second).toUpperCase();
    }
    return trimmed.slice(0, 2).toUpperCase();
  };

  // Generate a consistent background color based on the name
  const getBgColor = (str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
      'bg-red-500',
      'bg-orange-500',
      'bg-amber-500',
      'bg-yellow-600',
      'bg-green-500',
      'bg-emerald-500',
      'bg-teal-500',
      'bg-cyan-500',
      'bg-sky-500',
      'bg-blue-500',
      'bg-indigo-500',
      'bg-violet-500',
      'bg-purple-500',
      'bg-fuchsia-500',
      'bg-pink-500',
      'bg-rose-500',
    ];
    const index = Math.abs(hash) % colors.length;
    return colors[index] || 'bg-gray-500';
  };

  const sizeClasses = {
    sm: 'w-10 h-10 text-sm',
    md: 'w-12 h-12 text-base',
    lg: 'w-16 h-16 text-xl',
  };

  return (
    <div
      ref={containerRef}
      className={`relative flex items-center justify-center rounded-full overflow-hidden select-none shrink-0 ${sizeClasses[size]}`}
    >
      {finalSrc && !isError ? (
        <img
          src={finalSrc}
          alt={name}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <div className={`w-full h-full flex items-center justify-center text-white font-semibold ${getBgColor(name)}`}>
          {getInitials(name)}
        </div>
      )}
    </div>
  );
}
