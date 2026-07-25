import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  useChat,
  useChatMessages,
  useMarkAsRead,
  useSendText,
  useSendMedia,
  useEditMessage,
  useDeleteMessage,
  useReactToMessage,
} from "../../api/queries";
import { MessageDto } from "../../api/types";
import { formatMessageDateSeparator } from "../../utils/formatters";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import LoadingSpinner from "../ui/LoadingSpinner";
import Avatar from "../ui/Avatar";
import toast from "react-hot-toast";

interface ChatViewProps {
  chatId: string;
  onBack?: () => void;
}

/** Distance from the bottom (px) within which we consider the view "pinned". */
const PIN_THRESHOLD = 150;
/** Tighter threshold for "really at the bottom", used for mark-as-read. */
const AT_BOTTOM_THRESHOLD = 50;

/** Toggle verbose ChatView debug logging. */
const DEBUG = true;
const log = (...args: unknown[]): void => {
  if (DEBUG) console.log("[ChatView]", ...args);
};

export default function ChatView({
  chatId,
  onBack,
}: ChatViewProps): React.ReactElement {
  const [searchParams] = useSearchParams();
  const initialMessage = searchParams.get("message") || "";
  const queryClient = useQueryClient();

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // --- Scroll state lives in refs, not state ---------------------------------
  // The ResizeObserver callback is created once and closes over its initial
  // scope. Refs are the only way it can read fresh values without being torn
  // down and rebuilt on every render (which would drop resize notifications).
  const isPinnedRef = useRef<boolean>(true);
  const hasInitialScrolledRef = useRef<boolean>(false);
  const isLoadingOlderRef = useRef<boolean>(false);
  const lastScrollHeightRef = useRef<number>(0);

  const [maxOffset, setMaxOffset] = useState<number>(0);
  const [optimisticMessages, setOptimisticMessages] = useState<MessageDto[]>(
    [],
  );
  const [isLoadingOlder, setIsLoadingOlder] = useState<boolean>(false);
  const [editingMessage, setEditingMessage] = useState<MessageDto | null>(null);

  // Fetch chat details
  const {
    data: chat,
    isLoading: isChatLoading,
    error: chatError,
  } = useChat(chatId);

  // Exactly 4 hook calls for the 4 possible pages (offsets 0, 50, 100, 150)
  const page0 = useChatMessages(chatId, 0, { refetchInterval: 3000 });
  const page1 = useChatMessages(chatId, 50, { enabled: maxOffset >= 50 });
  const page2 = useChatMessages(chatId, 100, { enabled: maxOffset >= 100 });
  const page3 = useChatMessages(chatId, 150, { enabled: maxOffset >= 150 });

  const markAsReadMutation = useMarkAsRead();
  const sendTextMutation = useSendText();
  const sendMediaMutation = useSendMedia();
  const editMessageMutation = useEditMessage();
  const deleteMessageMutation = useDeleteMessage();
  const reactToMessageMutation = useReactToMessage();

  const handleEditMessage = useCallback((message: MessageDto) => {
    setEditingMessage(message);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingMessage(null);
  }, []);

  const handleSaveEdit = useCallback(async (newText: string) => {
    if (!editingMessage) return;
    try {
      await editMessageMutation.mutateAsync({
        id: editingMessage.id._serialized,
        newBody: newText,
      });
      setEditingMessage(null);
      toast.success("Message edited successfully");
    } catch (error) {
      toast.error("Failed to edit message");
    }
  }, [editingMessage, editMessageMutation]);

  const handleDeleteMessage = useCallback(async (messageId: string) => {
    if (!window.confirm("Are you sure you want to delete this message for everyone?")) {
      return;
    }
    try {
      await deleteMessageMutation.mutateAsync(messageId);
      toast.success("Message deleted successfully");
    } catch (error) {
      toast.error("Failed to delete message");
    }
  }, [deleteMessageMutation]);

  const handleReactToMessage = useCallback(async (messageId: string, emoji: string) => {
    try {
      await reactToMessageMutation.mutateAsync({ id: messageId, emoji });
    } catch (error) {
      toast.error("Failed to react to message");
    }
  }, [reactToMessageMutation]);

  // --- Pin helper -----------------------------------------------------------
  const stickToBottom = useCallback((): void => {
    const container = containerRef.current;
    if (!container) {
      log("stickToBottom: containerRef is null, aborting");
      return;
    }
    // Instant, never smooth. Smooth scrolling is animated and asynchronous:
    // the ResizeObserver fires again mid-animation, restarts it, and the view
    // never actually arrives. Instant writes are idempotent.
    log("stickToBottom: scrollTop ->", container.scrollHeight);
    container.scrollTop = container.scrollHeight;
    lastScrollHeightRef.current = container.scrollHeight;
  }, []);

  const pinAndScroll = useCallback((): void => {
    log("pinAndScroll: pinning and scrolling to bottom");
    isPinnedRef.current = true;
    stickToBottom();
  }, [stickToBottom]);

  // --- Reset everything when the chat changes -------------------------------
  useEffect(() => {
    log("chat changed, resetting state. chatId =", chatId);
    setMaxOffset(0);
    setOptimisticMessages([]);
    setIsLoadingOlder(false);
    isLoadingOlderRef.current = false;
    isPinnedRef.current = true;
    hasInitialScrolledRef.current = false;
    lastScrollHeightRef.current = 0;
  }, [chatId]);

  // --- Combine, de-duplicate, and sort messages chronologically -------------
  const combinedMessages = useMemo(() => {
    const map = new Map<string, MessageDto>();

    // Oldest to newest so newer pages win on overlap
    if (page3.data) page3.data.forEach((m) => map.set(m.id._serialized, m));
    if (page2.data) page2.data.forEach((m) => map.set(m.id._serialized, m));
    if (page1.data) page1.data.forEach((m) => map.set(m.id._serialized, m));
    if (page0.data) page0.data.forEach((m) => map.set(m.id._serialized, m));

    optimisticMessages.forEach((m) => map.set(m.id._serialized, m));

    const result = Array.from(map.values()).sort(
      (a, b) => a.timestamp - b.timestamp,
    );

    log(
      "combinedMessages recomputed:",
      "page0=" + (page0.data?.length ?? "n/a"),
      "page1=" + (page1.data?.length ?? "n/a"),
      "page2=" + (page2.data?.length ?? "n/a"),
      "page3=" + (page3.data?.length ?? "n/a"),
      "optimistic=" + optimisticMessages.length,
      "-> total=" + result.length,
    );

    return result;
  }, [page0.data, page1.data, page2.data, page3.data, optimisticMessages]);

  // --- Mark as read ---------------------------------------------------------
  const lastMarkedReadRef = useRef<{
    chatId: string;
    unreadCount: number;
  } | null>(null);

  const triggerMarkAsRead = useCallback(() => {
    if (chat && chat.unreadCount > 0) {
      const alreadyMarked =
        lastMarkedReadRef.current?.chatId === chatId &&
        lastMarkedReadRef.current?.unreadCount === chat.unreadCount;

      if (!alreadyMarked && !markAsReadMutation.isPending) {
        log(
          "triggerMarkAsRead: marking as read. chatId=",
          chatId,
          "unreadCount=",
          chat.unreadCount,
        );
        lastMarkedReadRef.current = { chatId, unreadCount: chat.unreadCount };
        markAsReadMutation.mutate(chatId);
      } else {
        log(
          "triggerMarkAsRead: skipped. alreadyMarked=",
          alreadyMarked,
          "isPending=",
          markAsReadMutation.isPending,
        );
      }
    }
  }, [chat, chatId, markAsReadMutation.isPending]);

  useEffect(() => {
    triggerMarkAsRead();
  }, [chatId, chat?.unreadCount, triggerMarkAsRead]);

  // Invalidate chats list query once messages are successfully fetched (and thus marked seen server-side)
  useEffect(() => {
    if (page0.isSuccess && page0.data) {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    }
  }, [page0.isSuccess, page0.data, queryClient]);

  // --- THE PIN: re-assert bottom on every layout change ---------------------
  // This is the whole fix. Anything that changes the content's height fires
  // this: an <img> finishing decode, a video poster resolving, a web font
  // swapping in, a bubble mounting, a prepended page. If we're pinned, we go
  // back to the bottom — regardless of what caused the growth or what is still
  // loading above.
  //
  // IMPORTANT: while `isChatLoading` is true (or there's a `chatError`), this
  // component's render returns an early-return branch with no
  // `containerRef`/`contentRef` elements attached at all. If this effect only
  // ran once on mount (empty deps), it would see null refs during that first
  // loading render, bail out, and — because its deps never change — NEVER run
  // again once the real scrollable container mounts. The ResizeObserver would
  // then simply never be attached, silently breaking the pin-to-bottom logic.
  // Depending on the "is the real container in the DOM" boolean makes the
  // effect re-run exactly when that transition happens.
  const isContainerReady = !isChatLoading && !chatError && !!chat;
  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    log(
      "ResizeObserver effect running. isContainerReady=",
      isContainerReady,
      "container=",
      !!container,
      "content=",
      !!content,
    );
    if (!container || !content) {
      log("ResizeObserver setup skipped: refs not ready");
      return;
    }

    const observer = new ResizeObserver(() => {
      const newScrollHeight = container.scrollHeight;

      log(
        "ResizeObserver fired: newScrollHeight=",
        newScrollHeight,
        "lastScrollHeight=",
        lastScrollHeightRef.current,
        "isPinned=",
        isPinnedRef.current,
        "isLoadingOlder=",
        isLoadingOlderRef.current,
      );

      if (isPinnedRef.current) {
        // Pinned wins over everything, including an in-flight prepend.
        log("ResizeObserver: pinned, forcing scrollTop to", newScrollHeight);
        container.scrollTop = newScrollHeight;
      } else if (isLoadingOlderRef.current) {
        // Not pinned + older messages arriving above: hold the user's place
        // by absorbing the delta they didn't ask for.
        const diff = newScrollHeight - lastScrollHeightRef.current;
        log("ResizeObserver: not pinned, loading older, diff=", diff);
        if (diff > 0) container.scrollTop += diff;
      }

      lastScrollHeightRef.current = container.scrollHeight;

      // The prepend has landed and been compensated for; release the flag.
      if (isLoadingOlderRef.current) {
        log("ResizeObserver: releasing isLoadingOlder flag");
        isLoadingOlderRef.current = false;
        setIsLoadingOlder(false);
      }
    });

    log("ResizeObserver: attached to content node");
    observer.observe(content);
    return () => {
      log("ResizeObserver: disconnecting");
      observer.disconnect();
    };
  }, [isContainerReady]);

  // --- Initial jump, before the browser paints ------------------------------
  useLayoutEffect(() => {
    if (hasInitialScrolledRef.current) {
      log("initial scroll: already done, skipping");
      return;
    }
    if (combinedMessages.length === 0) {
      log("initial scroll: no messages yet, skipping");
      return;
    }
    const container = containerRef.current;
    if (!container) {
      log("initial scroll: containerRef is null, skipping");
      return;
    }

    log(
      "initial scroll: jumping to bottom. scrollHeight=",
      container.scrollHeight,
      "messageCount=",
      combinedMessages.length,
    );
    container.scrollTop = container.scrollHeight;
    lastScrollHeightRef.current = container.scrollHeight;
    hasInitialScrolledRef.current = true;
  }, [combinedMessages.length, chatId]);

  // --- Scroll handler: pagination + pin state + mark-as-read ---------------
  const handleScroll = useCallback((): void => {
    const container = containerRef.current;
    if (!container) {
      log("handleScroll: containerRef is null, aborting");
      return;
    }

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;

    // Only a real user scroll away from the bottom can unpin. Our own
    // programmatic writes land at 0 distance and re-assert true.
    const wasPinned = isPinnedRef.current;
    isPinnedRef.current = distanceFromBottom <= PIN_THRESHOLD;

    if (wasPinned !== isPinnedRef.current) {
      log(
        "handleScroll: pin state changed",
        wasPinned,
        "->",
        isPinnedRef.current,
        "distanceFromBottom=",
        distanceFromBottom,
      );
    }

    // Load older messages. Guarded on hasInitialScrolled because scrollTop is
    // legitimately 0 on mount, before we've ever scrolled — without the guard
    // we'd fetch offset 50 the instant the component appears.
    if (
      hasInitialScrolledRef.current &&
      container.scrollTop <= 0 &&
      !isLoadingOlderRef.current
    ) {
      const currentPageIndex = maxOffset / 50;
      const pages = [page0, page1, page2, page3];
      const currentPage = pages[currentPageIndex];

      log(
        "handleScroll: at top. maxOffset=",
        maxOffset,
        "currentPageIndex=",
        currentPageIndex,
        "currentPage.data.length=",
        currentPage?.data?.length,
      );

      if (
        currentPage?.data &&
        currentPage.data.length === 50 &&
        maxOffset < 150
      ) {
        log("handleScroll: loading older page, new maxOffset=", maxOffset + 50);
        isLoadingOlderRef.current = true;
        lastScrollHeightRef.current = container.scrollHeight;
        setIsLoadingOlder(true);
        setMaxOffset((prev) => prev + 50);
      }
    }

    if (distanceFromBottom <= AT_BOTTOM_THRESHOLD) {
      triggerMarkAsRead();
    }
  }, [maxOffset, page0, page1, page2, page3, triggerMarkAsRead]);

  // --- Send text ------------------------------------------------------------
  const handleSendText = async (text: string): Promise<void> => {
    const tempId = `temp-text-${Date.now()}`;
    log("handleSendText: sending", { chatId, tempId, text });
    const tempMessage: MessageDto = {
      id: {
        fromMe: true,
        remote: chatId,
        id: tempId,
        _serialized: tempId,
      },
      body: text,
      hasMedia: false,
      type: "chat",
      from: {
        lid: null,
        pn: null,
        name: "Me",
        avatarUrl: null,
      },
      sentByUser: {
        userId: "",
        name: "Me",
        phoneNumber: "",
      },
      readBy: {
        someone: false,
        me: true,
        users: [],
      },
      timestamp: Math.floor(Date.now() / 1000),
    };

    // Sending is an explicit request to be at the bottom, even if the user had
    // scrolled up to read history.
    pinAndScroll();
    setOptimisticMessages((prev) => [...prev, tempMessage]);

    try {
      const result = await sendTextMutation.mutateAsync({
        chatId,
        message: text,
      });
      log("handleSendText: success", { tempId, resultId: result.id._serialized });
      setOptimisticMessages((prev) =>
        prev.map((m) => (m.id.id === tempId ? result : m)),
      );
    } catch (error) {
      log("handleSendText: failed", { tempId, error });
      setOptimisticMessages((prev) => prev.filter((m) => m.id.id !== tempId));
      toast.error("Failed to send message");
      throw error;
    }
  };

  // --- Send file ------------------------------------------------------------
  const handleSendFile = async (file: File): Promise<void> => {
    const tempId = `temp-media-${Date.now()}`;
    log("handleSendFile: sending", {
      chatId,
      tempId,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    });
    const tempMessage: MessageDto = {
      id: {
        fromMe: true,
        remote: chatId,
        id: tempId,
        _serialized: tempId,
      },
      body: file.name,
      hasMedia: true,
      type: file.type.startsWith("image/")
        ? "image"
        : file.type.startsWith("video/")
          ? "video"
          : file.type.startsWith("audio/")
            ? "audio"
            : "document",
      from: {
        lid: null,
        pn: null,
        name: "Me",
        avatarUrl: null,
      },
      sentByUser: {
        userId: "",
        name: "Me",
        phoneNumber: "",
      },
      readBy: {
        someone: false,
        me: true,
        users: [],
      },
      timestamp: Math.floor(Date.now() / 1000),
    };

    pinAndScroll();
    setOptimisticMessages((prev) => [...prev, tempMessage]);

    try {
      const result = await sendMediaMutation.mutateAsync({ chatId, file });
      log("handleSendFile: success", { tempId, resultId: result.id._serialized });
      setOptimisticMessages((prev) =>
        prev.map((m) => (m.id.id === tempId ? result : m)),
      );
    } catch (error) {
      log("handleSendFile: failed", { tempId, error });
      setOptimisticMessages((prev) => prev.filter((m) => m.id.id !== tempId));
      toast.error("Failed to send file");
      throw error;
    }
  };

  if (isChatLoading) {
    log("render: chat is loading, showing spinner. chatId=", chatId);
    return (
      <div className="flex-1 flex items-center justify-center bg-[#efeae2]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (chatError || !chat) {
    log("render: chat error or missing", { chatId, chatError, chat });
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#efeae2] p-4 text-center">
        <p className="text-red-500 font-semibold mb-2">Could not load chat</p>
        <p className="text-gray-600 text-sm mb-4">
          {chatError?.message || "Chat not found"}
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

  const isHistoryEndReached =
    maxOffset >= 150 || (page0.data && page0.data.length < 50);

  log("render:", {
    chatId,
    messageCount: combinedMessages.length,
    maxOffset,
    isLoadingOlder,
    isHistoryEndReached,
    isPinned: isPinnedRef.current,
  });

  return (
    <div className="flex flex-col h-full bg-[#efeae2] relative overflow-hidden">
      {/* Chat Header */}
      <header className="flex items-center justify-between bg-[#f0f2f5] border-b border-gray-200 px-4 py-2.5 pt-[calc(10px+env(safe-area-inset-top))] shrink-0 z-10 shadow-sm">
        <div className="flex items-center space-x-3 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              className="text-gray-600 hover:text-gray-800 p-2.5 rounded-full hover:bg-gray-200 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              title="Back"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          )}
          <Avatar
            contact={{
              lid: chat.isGroup ? null : chat.id._serialized,
              pn: chat.isGroup ? null : chat.id._serialized,
              name: chat.name,
              avatarUrl: chat.chatAvatarUrl,
            }}
            name={chat.name}
            size="sm"
          />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-gray-800 truncate">
              {chat.name}
            </h2>
            <p className="text-xs text-gray-500 truncate">
              {chat.isGroup ? "Group Chat" : "Direct Message"}
            </p>
          </div>
        </div>
      </header>

      {/* Messages Container (the scroll port) */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
        style={{
          backgroundImage:
            'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")',
          backgroundBlendMode: "overlay",
          backgroundColor: "#efeae2",
          // Let the browser keep our place when content above changes height.
          // Belt and braces alongside the ResizeObserver.
          overflowAnchor: "auto",
        }}
      >
        {/* Content wrapper — this is what the ResizeObserver measures. */}
        <div
          ref={contentRef}
          className="py-4 space-y-1 min-h-full flex flex-col"
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
            <div className="flex-1 flex items-center justify-center">
              <span className="bg-white bg-opacity-75 text-gray-500 text-sm px-4 py-2 rounded-lg shadow-sm">
                No messages yet. Say hi!
              </span>
            </div>
          ) : (
            combinedMessages.map((message, index) => {
              const prevMessage = combinedMessages[index - 1];
              let showDateSeparator = false;
              let dateSeparatorText = "";

              if (!prevMessage) {
                showDateSeparator = true;
                dateSeparatorText = formatMessageDateSeparator(
                  message.timestamp,
                );
              } else {
                const currentDate = new Date(
                  message.timestamp * 1000,
                ).toDateString();
                const prevDate = new Date(
                  prevMessage.timestamp * 1000,
                ).toDateString();
                if (currentDate !== prevDate) {
                  showDateSeparator = true;
                  dateSeparatorText = formatMessageDateSeparator(
                    message.timestamp,
                  );
                }
              }

              return (
                <div key={message.id._serialized}>
                  <MessageBubble
                    message={message}
                    isGroup={chat.isGroup}
                    showDateSeparator={showDateSeparator}
                    dateSeparatorText={dateSeparatorText}
                    onEdit={handleEditMessage}
                    onDelete={handleDeleteMessage}
                    onReact={handleReactToMessage}
                  />
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Message Input */}
      <MessageInput
        onSendText={handleSendText}
        onSendFile={handleSendFile}
        disabled={sendTextMutation.isPending || sendMediaMutation.isPending || editMessageMutation.isPending}
        initialValue={initialMessage}
        editingMessage={editingMessage}
        onCancelEdit={handleCancelEdit}
        onSaveEdit={handleSaveEdit}
      />
    </div>
  );
}