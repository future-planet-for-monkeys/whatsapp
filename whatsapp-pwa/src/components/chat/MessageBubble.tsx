import React from 'react';
import { MessageDto } from '../../api/types';
import { format } from 'date-fns';
import Avatar from '../ui/Avatar';
import MediaBubble from './MediaBubble';

interface MessageBubbleProps {
  message: MessageDto;
  isGroup: boolean;
  showDateSeparator: boolean;
  dateSeparatorText?: string;
}

export default function MessageBubble({
  message,
  isGroup,
  showDateSeparator,
  dateSeparatorText,
}: MessageBubbleProps): React.ReactElement {
  const { id, body, hasMedia, type, from, timestamp } = message;
  const isMe = id.fromMe;
  const timeStr = format(new Date(timestamp * 1000), 'HH:mm');

  return (
    <div className="flex flex-col w-full">
      {/* Date Separator */}
      {showDateSeparator && dateSeparatorText && (
        <div className="flex justify-center my-4">
          <span className="bg-white bg-opacity-90 text-gray-600 text-xs font-medium px-3 py-1 rounded-lg shadow-sm border border-gray-100">
            {dateSeparatorText}
          </span>
        </div>
      )}

      {/* Message Row */}
      <div
        className={`flex w-full items-end mb-2 px-4 ${
          isMe ? 'justify-end' : 'justify-start'
        }`}
      >
        {/* Avatar for Group Chats (Left-aligned only) */}
        {!isMe && isGroup && (
          <div className="mr-2 mb-1">
            <Avatar contact={from} name={from.name || from.pn || 'Unknown'} size="sm" />
          </div>
        )}

        {/* Message Bubble Container */}
        <div
          className={`relative max-w-[70%] rounded-lg px-3 py-1.5 shadow-sm ${
            isMe
              ? 'bg-[#d9fdd3] text-gray-900 rounded-tr-none'
              : 'bg-white text-gray-900 rounded-tl-none'
          }`}
        >
          {/* Sender Name for Group Chats (Left-aligned only) */}
          {!isMe && isGroup && (
            <div className="text-xs font-semibold text-whatsapp-teal mb-1 truncate">
              {from.name || from.pn || 'Unknown'}
            </div>
          )}

          {/* Message Content */}
          <div className="text-sm break-words pr-12">
            <MediaBubble
              messageId={id.id}
              type={type}
              body={body}
              hasMedia={hasMedia}
            />
          </div>

          {/* Timestamp */}
          <div className="absolute bottom-1 right-2 flex items-center space-x-1">
            <span className="text-[10px] text-gray-500 select-none">{timeStr}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
