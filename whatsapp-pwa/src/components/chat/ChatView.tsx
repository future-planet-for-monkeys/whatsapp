import { useEffect, useRef, useCallback } from 'react';
import { useMessages, useMarkAsRead } from '../../api/queries';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { formatMessageDate } from '../../utils/formatters';
import type { MessageItem } from '../../api/types';

export interface ChatViewProps {
  chatId: string;
  isGroup: boolean;
}

/**
 * Full chat view with message history, pagination (scroll-to-top), and input.
 * Marks messages as read when the view is opened.
 */
export function ChatView({ chatId, isGroup }: ChatViewProps): JSX.Element {
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMessages(chatId);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const markAsReadMutation = useMarkAsRead();
  const prevMessageCountRef = useRef<number>(0);

  // Mark as read when the chat is opened
  useEffect(() => {
    if (chatId) {
      markAsReadMutation.mutate(chatId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  // Scroll to bottom on initial load
  useEffect(() => {
    const currentCount = data?.pages.flatMap((p) => p.messages).length ?? 0;
    if (currentCount > 0 && prevMessageCountRef.current === 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }
    prevMessageCountRef.current = currentCount;
  }, [data]);

  // Scroll to top sentinel for infinite scroll (load older messages)
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
        <LoadingSpinner message="Loading messages..." size="lg" />
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <p className="text-red-500 mb-2">Failed to load messages</p>
        <p className="text-sm text-gray-500">
          {error instanceof Error ? error.message : 'Unknown error'}
        </p>
      </div>
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  const allMessages = data?.pages.flatMap((page) => page.messages) ?? [];
  if (allMessages.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-8">
            <div className="text-4xl mb-2">💬</div>
            <p className="text-gray-500">No messages yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Send a message to start the conversation
            </p>
          </div>
        </div>
        <MessageInput chatId={chatId} />
      </div>
    );
  }

  // Sort messages oldest → newest for display
  const sortedMessages = [...allMessages].sort((a, b) => a.timestamp - b.timestamp);

  // ── Loaded state ─────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-[#efeae2] relative">
      {/* Messages area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-2 relative z-10"
        style={{
          backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")',
          backgroundRepeat: 'repeat',
          backgroundSize: 'auto',
          opacity: 0.95
        }}
      >
        {/* Sentinel for infinite scroll */}
        <div ref={sentinelRef} className="h-2" />

        {isFetchingNextPage && (
          <div className="py-2">
            <LoadingSpinner size="sm" message="Loading older messages..." />
          </div>
        )}

        {/* Date separators and messages */}
        {sortedMessages.map((msg: MessageItem, index: number) => {
          const prevMsg = index > 0 ? sortedMessages[index - 1] : null;
          const showDateSeparator = !prevMsg || !isSameDay(prevMsg.timestamp, msg.timestamp);

          return (
            <div key={msg.id} className="flex flex-col">
              {showDateSeparator && (
                <div className="flex justify-center my-3">
                  <span className="text-xs text-gray-600 bg-[#e1f3fc] px-3 py-1 rounded-md shadow-sm font-medium uppercase tracking-wider">
                    {formatMessageDate(msg.timestamp)}
                  </span>
                </div>
              )}
              <MessageBubble message={msg} showAuthor={isGroup} />
            </div>
          );
        })}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <MessageInput chatId={chatId} />
    </div>
  );
}

/**
 * Check if two Unix timestamps fall on the same calendar day.
 */
function isSameDay(ts1: number, ts2: number): boolean {
  const d1 = new Date(ts1 * 1000);
  const d2 = new Date(ts2 * 1000);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}