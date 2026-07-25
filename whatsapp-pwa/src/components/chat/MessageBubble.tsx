import React, { useState } from 'react';
import { MessageDto } from '../../api/types';
import { format } from 'date-fns';
import Avatar from '../ui/Avatar';
import MediaBubble from './MediaBubble';
import SeenByBubbles from './SeenByBubbles';

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
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!body) return;
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

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
          className={`relative max-w-[70%] rounded-lg px-3 py-1.5 shadow-sm select-text group ${
            isMe
              ? 'bg-[#d9fdd3] text-gray-900 rounded-tr-none'
              : 'bg-white text-gray-900 rounded-tl-none'
          }`}
        >
          {/* Sender Name for Group Chats (Left-aligned only) */}
          {!isMe && isGroup && (
            <div className="text-xs font-semibold text-whatsapp-teal mb-1 truncate select-none">
              {from.name || from.pn || 'Unknown'}
            </div>
          )}

          {/* Copy Button */}
          {body && body.trim().length > 0 && (
            <button
              onClick={handleCopy}
              className="absolute top-1 right-1 p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-black hover:bg-opacity-5 md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-opacity duration-150 select-none"
              title="Copy message"
            >
              {copied ? (
                <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
              )}
            </button>
          )}

          {/* Message Content */}
          <div className={`text-sm break-words ${message.readBy?.users && message.readBy.users.length > 0 ? 'pr-20' : 'pr-12'}`}>
            <MediaBubble
              messageId={id._serialized}
              type={type}
              body={body}
              hasMedia={hasMedia}
            />
          </div>

          {/* Timestamp */}
          <div className="absolute bottom-1 right-2 flex items-center space-x-1.5">
            {message.readBy?.users && message.readBy.users.length > 0 && (
              <SeenByBubbles users={message.readBy.users} />
            )}
            <span className="text-[10px] text-gray-500 select-none">{timeStr}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
