import React, { useState } from 'react';
import { MessageDto } from '../../api/types';
import { format } from 'date-fns';
import Avatar from '../ui/Avatar';
import MediaBubble from './MediaBubble';
import SeenByBubbles from './SeenByBubbles';
import { useLongPress } from '../../hooks/useLongPress';
import ActionMenu, { ActionItem } from '../ui/ActionMenu';
import { Copy, Edit, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface MessageBubbleProps {
  message: MessageDto;
  isGroup: boolean;
  showDateSeparator: boolean;
  dateSeparatorText?: string;
  onEdit?: (message: MessageDto) => void;
  onDelete?: (messageId: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
}

export default function MessageBubble({
  message,
  isGroup,
  showDateSeparator,
  dateSeparatorText,
  onEdit,
  onDelete,
  onReact,
}: MessageBubbleProps): React.ReactElement {
  const { id, body, hasMedia, type, from, timestamp, isEdited, reactions } = message;
  const isDeleted = !!message.isDeleted || type === 'revoked';
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
    if (!isDeleted) {
      setIsMenuOpen(true);
    }
  });

  const actions: ActionItem[] = [];

  if (!isDeleted) {
    if (body && body.trim().length > 0) {
      actions.push({
        label: 'Copy',
        icon: <Copy className="w-4 h-4" />,
        onClick: handleCopy,
      });
    }

    const isWithinEditWindow = (Date.now() / 1000) - timestamp <= 180;

    if (isMe && type === 'chat' && onEdit && isWithinEditWindow) {
      actions.push({
        label: 'Edit Message',
        icon: <Edit className="w-4 h-4" />,
        onClick: () => onEdit(message),
      });
    }

    if (isMe && onDelete) {
      actions.push({
        label: 'Delete for Everyone',
        icon: <Trash2 className="w-4 h-4" />,
        onClick: () => onDelete(id._serialized),
        danger: true,
      });
    }
  }

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
          <div className={`text-sm break-words ${message.readBy?.users && message.readBy.users.length > 0 ? 'pr-20' : 'pr-12'} ${reactions && reactions.length > 0 ? 'pb-2' : ''}`}>
            {isDeleted ? (
              <span className="text-gray-400 flex items-center gap-1 select-none">
                <span className="text-xs">🚫</span> This message was deleted
              </span>
            ) : (
              <MediaBubble
                messageId={id._serialized}
                type={type}
                body={body}
                hasMedia={hasMedia}
              />
            )}
          </div>

          {/* Timestamp */}
          <div className="absolute bottom-1 right-2 flex items-center space-x-1.5">
            {isEdited && !isDeleted && (
              <span className="text-[9px] text-gray-400 italic select-none">(edited)</span>
            )}
            {message.readBy?.users && message.readBy.users.length > 0 && (
              <SeenByBubbles users={message.readBy.users} />
            )}
            <span className="text-[10px] text-gray-500 select-none">{timeStr}</span>
          </div>

          {/* Reactions */}
          {reactions && reactions.length > 0 && (
            <div className="absolute -bottom-2.5 right-3 flex items-center space-x-1 bg-white rounded-full px-1.5 py-0.5 shadow-sm border border-gray-100 text-xs select-none z-10">
              {reactions.map((r, idx) => (
                <span
                  key={idx}
                  title={r.users.map(u => u.name).join(', ')}
                  className={`flex items-center space-x-0.5 cursor-pointer hover:scale-110 transition-transform ${r.reactedByMe ? 'font-semibold text-whatsapp-teal' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onReact) {
                      onReact(id._serialized, r.reactedByMe ? '' : r.emoji);
                    }
                  }}
                >
                  <span>{r.emoji}</span>
                  {r.count > 1 && <span className="text-[10px] text-gray-500">{r.count}</span>}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Action Menu */}
        <ActionMenu
          isOpen={isMenuOpen}
          onClose={() => setIsMenuOpen(false)}
          title="Message Options"
          subtitle={isDeleted ? 'This message was deleted' : (body && body.length > 60 ? `${body.slice(0, 60)}...` : body || undefined)}
          actions={actions}
          onReact={onReact ? (emoji) => onReact(id._serialized, emoji) : undefined}
        />
      </div>
    </div>
  );
}
