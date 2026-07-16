import { useNavigate, useParams } from 'react-router-dom';
import { Avatar } from '../ui/Avatar';
import { formatChatTime, truncate } from '../../utils/formatters';
import type { ChatItem } from '../../api/types';

export interface ChatListItemProps {
  chat: ChatItem;
}

/**
 * A single row in the chat list.
 * Shows avatar, name, last message preview, timestamp, and unread badge.
 * Highlights the active chat on desktop.
 */
export function ChatListItem({ chat }: ChatListItemProps): JSX.Element {
  const navigate = useNavigate();
  const { chatId } = useParams<{ chatId: string }>();

  const isActive = chatId === chat.id;

  const handleClick = (): void => {
    navigate(`/chat/${encodeURIComponent(chat.id)}`);
  };

  const lastMessageText = chat.lastMessage
    ? `${chat.lastMessage.fromMe ? 'You: ' : ''}${truncate(chat.lastMessage.body, 50)}`
    : 'No messages yet';

  return (
    <button
      onClick={handleClick}
      className={`w-full flex items-center gap-3 px-4 py-3 transition-colors border-b border-gray-100 min-h-touch text-left ${
        isActive
          ? 'bg-[#ebebeb] hover:bg-[#ebebeb]'
          : 'hover:bg-gray-50 active:bg-gray-100'
      }`}
      type="button"
    >
      <Avatar contactId={chat.id} name={chat.name} size={48} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm text-gray-900 truncate">
            {chat.name || 'Unknown'}
          </span>
          <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
            {formatChatTime(chat.timestamp)}
          </span>
        </div>

        <div className="flex items-center justify-between mt-0.5">
          <span className="text-sm text-gray-500 truncate">
            {lastMessageText}
          </span>

          {chat.unreadCount > 0 && (
            <span className="flex-shrink-0 ml-2 bg-[#25d366] text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
              {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}