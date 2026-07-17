import React, { useState, useEffect, useRef } from 'react';
import { useChat, useChatMessages, useMarkAsRead, useSendText, useSendMedia } from '../../api/queries';
import { MessageDto } from '../../api/types';
import { formatMessageDateSeparator } from '../../utils/formatters';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import LoadingSpinner from '../ui/LoadingSpinner';
import Avatar from '../ui/Avatar';
import toast from 'react-hot-toast';

interface ChatViewProps {
  chatId: string;
  onBack?: () => void;
}

export default function ChatView({ chatId, onBack }: ChatViewProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const [maxOffset, setMaxOffset] = useState<number>(0);
  const [optimisticMessages, setOptimisticMessages] = useState<MessageDto[]>([]);
  const [isLoadingOlder, setIsLoadingOlder] = useState<boolean>(false);
  const [prevScrollHeight, setPrevScrollHeight] = useState<number>(0);
  const [hasInitialScrolled, setHasInitialScrolled] = useState<boolean>(false);

  // Fetch chat details
  const { data: chat, isLoading: isChatLoading, error: chatError } = useChat(chatId);

  // Declare exactly 4 hook calls for the 4 possible pages (offsets 0, 50, 100, 150)
  const page0 = useChatMessages(chatId, 0, { refetchInterval: 3000 });
  const page1 = useChatMessages(chatId, 50, { enabled: maxOffset >= 50 });
  const page2 = useChatMessages(chatId, 100, { enabled: maxOffset >= 100 });
  const page3 = useChatMessages(chatId, 150, { enabled: maxOffset >= 150 });

  const markAsReadMutation = useMarkAsRead();
  const sendTextMutation = useSendText();
  const sendMediaMutation = useSendMedia();

  // Reset state when chatId changes
  useEffect(() => {
    setMaxOffset(0);
    setOptimisticMessages([]);
    setIsLoadingOlder(false);
    setPrevScrollHeight(0);
    setHasInitialScrolled(false);
  }, [chatId]);

  // Combine, de-duplicate, and sort messages chronologically
  const combinedMessages = React.useMemo(() => {
    const map = new Map<string, MessageDto>();

    // Add from oldest to newest so newer ones overwrite if there are overlaps
    if (page3.data) page3.data.forEach((m) => map.set(m.id._serialized, m));
    if (page2.data) page2.data.forEach((m) => map.set(m.id._serialized, m));
    if (page1.data) page1.data.forEach((m) => map.set(m.id._serialized, m));
    if (page0.data) page0.data.forEach((m) => map.set(m.id._serialized, m));

    // Add optimistic messages
    optimisticMessages.forEach((m) => map.set(m.id._serialized, m));

    return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
  }, [page0.data, page1.data, page2.data, page3.data, optimisticMessages]);

  // Mark as read function
  const triggerMarkAsRead = React.useCallback(() => {
    if (chat && chat.unreadCount > 0) {
      markAsReadMutation.mutate(chatId);
    }
  }, [chat, chatId, markAsReadMutation]);

  // Mark as read on mount or when unreadCount changes
  useEffect(() => {
    triggerMarkAsRead();
  }, [chatId, chat?.unreadCount, triggerMarkAsRead]);

  // Scroll to bottom helper
  const scrollToBottom = (behavior: 'smooth' | 'auto' = 'smooth'): void => {
    const container = containerRef.current;
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior,
      });
    }
  };

  // Scroll to bottom on initial load
  useEffect(() => {
    if (page0.data && page0.data.length > 0 && !hasInitialScrolled) {
      scrollToBottom('auto');
      setHasInitialScrolled(true);
    }
  }, [page0.data, hasInitialScrolled]);

  // Scroll to bottom when we send a message
  useEffect(() => {
    if (optimisticMessages.length > 0) {
      scrollToBottom('smooth');
    }
  }, [optimisticMessages.length]);

  // Scroll to bottom on new incoming messages if already near bottom
  const prevMessagesLengthRef = useRef<number>(0);
  useEffect(() => {
    const container = containerRef.current;
    if (container && combinedMessages.length > prevMessagesLengthRef.current) {
      const isNearBottom =
        container.scrollHeight - container.scrollTop <= container.clientHeight + 150;
      if (isNearBottom) {
        scrollToBottom('smooth');
      }
    }
    prevMessagesLengthRef.current = combinedMessages.length;
  }, [combinedMessages]);

  // Adjust scroll position after loading older messages
  useEffect(() => {
    const container = containerRef.current;
    if (container && prevScrollHeight > 0 && isLoadingOlder) {
      const newScrollHeight = container.scrollHeight;
      const diff = newScrollHeight - prevScrollHeight;
      container.scrollTop = diff;
      setPrevScrollHeight(0);
      setIsLoadingOlder(false);
    }
  }, [combinedMessages, isLoadingOlder, prevScrollHeight]);

  // Scroll handler for pagination and mark-as-read
  const handleScroll = (): void => {
    const container = containerRef.current;
    if (!container) return;

    // Check if scrolled to top to load older messages
    if (container.scrollTop === 0 && !isLoadingOlder) {
      const currentPageIndex = maxOffset / 50;
      const pages = [page0, page1, page2, page3];
      const currentPage = pages[currentPageIndex];

      if (currentPage?.data && currentPage.data.length === 50 && maxOffset < 150) {
        setIsLoadingOlder(true);
        setPrevScrollHeight(container.scrollHeight);
        setMaxOffset((prev) => prev + 50);
      }
    }

    // Check if scrolled to bottom to mark as read
    const isAtBottom =
      container.scrollHeight - container.scrollTop <= container.clientHeight + 50;
    if (isAtBottom) {
      triggerMarkAsRead();
    }
  };

  // Send text handler
  const handleSendText = async (text: string): Promise<void> => {
    const tempId = `temp-text-${Date.now()}`;
    const tempMessage: MessageDto = {
      id: {
        fromMe: true,
        remote: chatId,
        id: tempId,
        _serialized: tempId,
      },
      body: text,
      hasMedia: false,
      type: 'chat',
      from: {
        lid: null,
        pn: null,
        name: 'Me',
        avatarUrl: null,
      },
      timestamp: Math.floor(Date.now() / 1000),
    };

    setOptimisticMessages((prev) => [...prev, tempMessage]);

    try {
      const result = await sendTextMutation.mutateAsync({ chatId, message: text });
      setOptimisticMessages((prev) =>
        prev.map((m) => (m.id.id === tempId ? result : m))
      );
    } catch (error) {
      setOptimisticMessages((prev) => prev.filter((m) => m.id.id !== tempId));
      toast.error('Failed to send message');
      throw error;
    }
  };

  // Send file handler
  const handleSendFile = async (file: File): Promise<void> => {
    const tempId = `temp-media-${Date.now()}`;
    const tempMessage: MessageDto = {
      id: {
        fromMe: true,
        remote: chatId,
        id: tempId,
        _serialized: tempId,
      },
      body: file.name,
      hasMedia: true,
      type: file.type.startsWith('image/')
        ? 'image'
        : file.type.startsWith('video/')
        ? 'video'
        : file.type.startsWith('audio/')
        ? 'audio'
        : 'document',
      from: {
        lid: null,
        pn: null,
        name: 'Me',
        avatarUrl: null,
      },
      timestamp: Math.floor(Date.now() / 1000),
    };

    setOptimisticMessages((prev) => [...prev, tempMessage]);

    try {
      const result = await sendMediaMutation.mutateAsync({ chatId, file });
      setOptimisticMessages((prev) =>
        prev.map((m) => (m.id.id === tempId ? result : m))
      );
    } catch (error) {
      setOptimisticMessages((prev) => prev.filter((m) => m.id.id !== tempId));
      toast.error('Failed to send file');
      throw error;
    }
  };

  if (isChatLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#efeae2]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (chatError || !chat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#efeae2] p-4 text-center">
        <p className="text-red-500 font-semibold mb-2">Could not load chat</p>
        <p className="text-gray-600 text-sm mb-4">
          {chatError?.message || 'Chat not found'}
        </p>
        {onBack && (
          <button
            onClick={onBack}
            className="bg-whatsapp-teal text-white px-4 py-2 rounded-lg shadow hover:bg-opacity-90 transition-colors"
          >
            Go Back
          </button>
        )}
      </div>
    );
  }

  const isHistoryEndReached = maxOffset >= 150 || (page0.data && page0.data.length < 50);

  return (
    <div className="flex flex-col h-full bg-[#efeae2] relative overflow-hidden">
      {/* Chat Header */}
      <header className="flex items-center justify-between bg-[#f0f2f5] border-b border-gray-200 px-4 py-2.5 pt-[calc(10px+env(safe-area-inset-top))] shrink-0 z-10 shadow-sm">
        <div className="flex items-center space-x-3 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              className="md:hidden text-gray-600 hover:text-gray-800 p-2.5 rounded-full hover:bg-gray-200 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              title="Back"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <Avatar contact={null} name={chat.name} size="sm" />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-gray-800 truncate">{chat.name}</h2>
            <p className="text-xs text-gray-500 truncate">
              {chat.isGroup ? 'Group Chat' : 'Direct Message'}
            </p>
          </div>
        </div>
      </header>

      {/* Messages Container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto py-4 space-y-1"
        style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundBlendMode: 'overlay', backgroundColor: '#efeae2' }}
      >
        {/* History End Marker */}
        {isHistoryEndReached && (
          <div className="text-center my-4">
            <span className="bg-white bg-opacity-75 text-gray-500 text-xs px-3 py-1 rounded-lg shadow-sm border border-gray-100">
              Earlier messages aren't available
            </span>
          </div>
        )}

        {/* Loading Older Spinner */}
        {isLoadingOlder && (
          <div className="flex justify-center py-2">
            <LoadingSpinner size="sm" />
          </div>
        )}

        {/* Messages List */}
        {combinedMessages.length === 0 && !page0.isLoading ? (
          <div className="flex items-center justify-center h-full">
            <span className="bg-white bg-opacity-75 text-gray-500 text-sm px-4 py-2 rounded-lg shadow-sm">
              No messages yet. Say hi!
            </span>
          </div>
        ) : (
          combinedMessages.map((message, index) => {
            const prevMessage = combinedMessages[index - 1];
            let showDateSeparator = false;
            let dateSeparatorText = '';

            if (!prevMessage) {
              showDateSeparator = true;
              dateSeparatorText = formatMessageDateSeparator(message.timestamp);
            } else {
              const currentDate = new Date(message.timestamp * 1000).toDateString();
              const prevDate = new Date(prevMessage.timestamp * 1000).toDateString();
              if (currentDate !== prevDate) {
                showDateSeparator = true;
                dateSeparatorText = formatMessageDateSeparator(message.timestamp);
              }
            }

            return (
              <MessageBubble
                key={message.id._serialized}
                message={message}
                isGroup={chat.isGroup}
                showDateSeparator={showDateSeparator}
                dateSeparatorText={dateSeparatorText}
              />
            );
          })
        )}
      </div>

      {/* Message Input */}
      <MessageInput
        onSendText={handleSendText}
        onSendFile={handleSendFile}
        disabled={sendTextMutation.isPending || sendMediaMutation.isPending}
      />
    </div>
  );
}
