import { useParams, useNavigate } from 'react-router-dom';
import { ChatView } from '../components/chat/ChatView';
import { useChats } from '../api/queries';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

/**
 * Individual chat page showing message history and input.
 * Route param: chatId
 */
export function ChatPage(): JSX.Element {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useChats();

  // Find the chat name from the cached chat list
  const allChats = data?.pages.flatMap((page) => page.chats) ?? [];
  const chat = allChats.find((c) => c.id === chatId);

  if (!chatId) {
    navigate('/chats', { replace: true });
    return <></>;
  }

  // ── Loading state ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="h-screen bg-white flex flex-col">
        <div className="bg-whatsapp-header-bg text-white px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10" />
          <LoadingSpinner size="sm" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner message="Loading chat..." size="lg" />
        </div>
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="h-screen bg-white flex flex-col">
        <div className="bg-whatsapp-header-bg text-white px-4 py-3 flex items-center gap-3">
          <button
            onClick={(): void => navigate('/chats')}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors min-w-touch min-h-touch"
            type="button"
            aria-label="Back"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h1 className="text-lg font-semibold">Error</h1>
        </div>
        <div className="flex-1 flex items-center justify-center p-8 text-center">
          <p className="text-red-500">Failed to load chat</p>
        </div>
      </div>
    );
  }

  const chatName = chat?.name ?? chatId;
  const isGroup = chat?.isGroup ?? false;

  return (
    <div className="h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="bg-whatsapp-header-bg text-white px-4 py-3 flex items-center gap-3">
        <button
          onClick={(): void => navigate('/chats')}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors min-w-touch min-h-touch"
          type="button"
          aria-label="Back"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold truncate">{chatName}</h1>
          {isGroup && <p className="text-xs text-white/80">Group</p>}
        </div>
      </div>

      {/* Chat view */}
      <div className="flex-1 overflow-hidden">
        <ChatView chatId={chatId} isGroup={isGroup} />
      </div>
    </div>
  );
}