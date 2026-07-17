import React from 'react';
import { Link } from 'react-router-dom';
import { ChatDto } from '../../api/types';
import Avatar from '../ui/Avatar';
import { formatChatTimestamp, getMessagePreview } from '../../utils/formatters';

interface ChatListItemProps {
  chat: ChatDto;
}

export default function ChatListItem({ chat }: ChatListItemProps): React.ReactElement {
  const hasUnread = chat.unreadCount > 0;
  const previewText = getMessagePreview(chat.lastMessage);
  const formattedTime = formatChatTimestamp(chat.timestamp);

  // Determine the contact info for the avatar.
  // If it's a group, we can pass null or construct a dummy contact info.
  // If it's a single chat, we can use chat.lastMessage?.from or construct one.
  // Wait, let's check if ChatDto has a contactInfo or if we should use chat.id._serialized or chat.name.
  // Let's look at ChatDto in types.ts:
  // export interface ChatDto {
  //   archived: boolean;
  //   id: ChatIdDto;
  //   isGroup: boolean;
  //   name: string;
  //   unreadCount: number;
  //   lastMessage: MessageDto | null;
  //   pinned: boolean;
  //   timestamp: number;
  // }
  // Wait, if it's a group, we can pass a contact with lid: null, avatarUrl: null, pn: null, name: chat.name.
  // If it's a single chat, we can use chat.lastMessage?.from (if available) or construct a contact with lid: chat.id.user, avatarUrl: null, pn: null, name: chat.name.
  // Wait, let's check if chat.id.user is the lid or if we can use chat.id._serialized.
  // Actually, let's construct a ContactInfoDto:
  const contact = chat.lastMessage?.from || {
    lid: chat.isGroup ? null : chat.id.user,
    pn: chat.isGroup ? null : chat.id.user,
    name: chat.name,
    avatarUrl: null,
  };

  return (
    <Link
      to={`/chat/${encodeURIComponent(chat.id._serialized)}`}
      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 border-b border-gray-100 transition-colors duration-150 select-none"
    >
      <Avatar contact={contact} name={chat.name} size="md" />

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className={`text-base text-gray-900 truncate ${hasUnread ? 'font-bold' : 'font-normal'}`}>
            {chat.name}
          </h3>
          <span className={`text-xs shrink-0 ${hasUnread ? 'text-whatsapp-green font-semibold' : 'text-gray-500'}`}>
            {formattedTime}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className={`text-sm truncate flex-1 ${hasUnread ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
            {previewText || '\u00A0'}
          </p>
          {hasUnread && (
            <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-whatsapp-green text-white text-xs font-bold shrink-0">
              {chat.unreadCount}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
