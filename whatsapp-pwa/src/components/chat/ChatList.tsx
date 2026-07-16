import { useRef, useCallback, useEffect } from 'react';
import { useChats } from '../../api/queries';
import { ChatListItem } from './ChatListItem';
import { LoadingSpinner } from '../ui/LoadingSpinner';

/**
 * Infinite-scrolling chat list.
 * Renders all loaded chats and fetches more as the user scrolls to the bottom.
 */
export function ChatList(): JSX.Element {
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useChats();

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]): void => {
      const [entry] = entries;
      if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(handleObserver, {
      rootMargin: '200px',
    });
    observer.observe(sentinel);

    return (): void => {
      observer.disconnect();
    };
  }, [handleObserver]);

  // ── Loading state ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <LoadingSpinner message="Loading chats..." size="lg" />
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <p className="text-red-500 mb-2">Failed to load chats</p>
        <p className="text-sm text-gray-500">
          {error instanceof Error ? error.message : 'Unknown error'}
        </p>
      </div>
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  const allChats = data?.pages.flatMap((page) => page.chats) ?? [];
  if (allChats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="text-4xl mb-2">💬</div>
        <p className="text-gray-500 font-medium">No chats yet</p>
        <p className="text-sm text-gray-400 mt-1">
          Start a new conversation using the + button
        </p>
      </div>
    );
  }

  // ── Loaded state ─────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {allChats.map((chat) => (
          <ChatListItem key={chat.id} chat={chat} />
        ))}

        {/* Sentinel for infinite scroll */}
        <div ref={sentinelRef} className="h-4" />

        {isFetchingNextPage && (
          <div className="py-4">
            <LoadingSpinner size="sm" message="Loading more..." />
          </div>
        )}
      </div>
    </div>
  );
}