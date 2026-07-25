import React, { useState } from 'react';
import { MessageDto } from '../../api/types';
import { format } from 'date-fns';
import Avatar from '../ui/Avatar';
import MediaBubble from './MediaBubble';
import SeenByBubbles from './SeenByBubbles';
import { useLongPress } from '../../hooks/useLongPress';
import ActionMenu, { ActionItem } from '../ui/ActionMenu';
import { Copy } from 'lucide-react';
import toast from 'react-hot-toast';

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
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleCopy = async () => {
    if (!body) return;
    try {
      await navigator.clipboard.writeText(body);
      toast.success('Message copied to clipboard');
    } catch (err) {
      console.error('Failed to copy text: ', err);
      toast.error('Failed to copy message');
    }
  };

  const longPressProps = useLongPress(() => {
    if (body && body.trim().length > 0) {
      setIsMenuOpen(true);
    }
  });

  const actions: ActionItem[] = [
    {
      label: 'Copy',
      icon: <Copy className="w-4 h-4" />,
      onClick: handleCopy,
    },
  ];

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
          {...longPressProps}
          className={`relative max-w-[70%] rounded-lg px-3 py-1.5 shadow-sm select-none group cursor-pointer active:scale-[0.99] transition-transform duration-100 ${
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

        {/* Action Menu */}
        <ActionMenu
          isOpen={isMenuOpen}
          onClose={() => setIsMenuOpen(false)}
          title="Message Options"
          subtitle={body && body.length > 60 ? `${body.slice(0, 60)}...` : body || undefined}
          actions={actions}
        />
      </div>
    </div>
  );
}
