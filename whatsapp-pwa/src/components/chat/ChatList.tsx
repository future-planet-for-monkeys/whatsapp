import React, { useEffect, useRef } from 'react';
import { useInfiniteChats } from '../../api/queries';
import ChatListItem from './ChatListItem';

export default function ChatList(): React.ReactElement {
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useInfiniteChats();

  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // 1. Loading State (Shimmer Skeleton)
  if (isLoading) {
    return (
      <div className="flex flex-col divide-y divide-gray-100 animate-pulse">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="w-12 h-12 rounded-full bg-gray-200 shrink-0" />
            <div className="flex-1 min-w-0 py-1">
              <div className="flex justify-between gap-2">
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="h-3 bg-gray-200 rounded w-12" />
              </div>
              <div className="h-3 bg-gray-200 rounded w-2/3 mt-2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // 2. Error State
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center min-h-[50vh]">
        <p className="text-red-500 font-medium mb-4">Could not load chats</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-whatsapp-teal text-white rounded-md hover:bg-whatsapp-teal-dark transition-colors font-semibold shadow-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  // Flatten pages of chats
  const chats = data?.pages.flat() || [];

  // 3. Empty State
  if (chats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center min-h-[50vh]">
        <p className="text-gray-500">No chats yet</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-gray-100 bg-white">
      {chats.map((chat) => (
        <ChatListItem key={chat.id._serialized} chat={chat} />
      ))}

      {/* Infinite Scroll Trigger */}
      {hasNextPage && (
        <div
          ref={loadMoreRef}
          className="flex items-center justify-center py-4 text-gray-500 text-sm"
        >
          {isFetchingNextPage ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-whatsapp-teal border-t-transparent rounded-full animate-spin" />
              <span>Loading more...</span>
            </div>
          ) : (
            <span>Scroll down to load more</span>
          )}
        </div>
      )}
    </div>
  );
}
