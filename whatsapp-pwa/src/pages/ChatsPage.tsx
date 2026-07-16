import { useNavigate, useParams } from 'react-router-dom';
import { ChatList } from '../components/chat/ChatList';
import { ChatView } from '../components/chat/ChatView';
import { WelcomeView } from '../components/chat/WelcomeView';
import { useAuth } from '../hooks/useAuth';
import { useChats } from '../api/queries';

/**
 * Main chat list page.
 * Shows the list of all WhatsApp chats with a header.
 * Supports responsive split-pane layout on desktop.
 */
export function ChatsPage(): JSX.Element {
  const navigate = useNavigate();
  const { chatId } = useParams<{ chatId: string }>();
  const { logout } = useAuth();
  const { data } = useChats();

  // Find the chat name from the cached chat list
  const allChats = data?.pages.flatMap((page) => page.chats) ?? [];
  const chat = allChats.find((c) => c.id === chatId);
  const isGroup = chat?.isGroup ?? false;

  return (
    <div className="h-screen flex bg-[#f0f2f5] overflow-hidden">
      {/* Left Pane: Chat List (Hidden on mobile when a chat is active) */}
      <div
        className={`w-full md:w-[400px] lg:w-[450px] flex-shrink-0 flex flex-col bg-white border-r border-gray-200 h-full ${
          chatId ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Header */}
        <div className="bg-[#008069] text-white px-4 py-3 flex items-center justify-between h-[60px] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-bold text-sm">
              WA
            </div>
            <h1 className="text-lg font-semibold tracking-wide">WhatsApp</h1>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={(): void => navigate('/new-chat')}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors min-w-touch min-h-touch"
              type="button"
              aria-label="New chat"
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
            <button
              onClick={logout}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors min-w-touch min-h-touch"
              type="button"
              aria-label="Logout"
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
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Chat list */}
        <div className="flex-1 overflow-hidden">
          <ChatList />
        </div>
      </div>

      {/* Right Pane: Chat View or Welcome Screen */}
      <div
        className={`flex-1 flex flex-col h-full bg-[#efeae2] ${
          chatId ? 'flex' : 'hidden md:flex'
        }`}
      >
        {chatId ? (
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="bg-[#f0f2f5] text-gray-800 px-4 py-2 flex items-center gap-3 h-[60px] border-b border-gray-200 flex-shrink-0">
              <button
                onClick={(): void => navigate('/chats')}
                className="md:hidden w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors min-w-touch min-h-touch"
                type="button"
                aria-label="Back"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-gray-600"
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
                <h1 className="text-base font-semibold text-gray-800 truncate">
                  {chat?.name ?? chatId}
                </h1>
                {isGroup && <p className="text-xs text-gray-500">Group</p>}
              </div>
            </div>

            {/* Chat view */}
            <div className="flex-1 overflow-hidden">
              <ChatView chatId={chatId} isGroup={isGroup} />
            </div>
          </div>
        ) : (
          <WelcomeView />
        )}
      </div>
    </div>
  );
}