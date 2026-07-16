import { useState, useRef, useCallback, type KeyboardEvent } from 'react';
import { useSendMessage } from '../../api/queries';
import { useMediaUpload } from '../../hooks/useMediaUpload';
import { validateMessageBody } from '../../utils/validators';
import toast from 'react-hot-toast';

export interface MessageInputProps {
  chatId: string;
}

/**
 * Message input area with textarea, send button, and media attach button.
 */
export function MessageInput({ chatId }: MessageInputProps): JSX.Element {
  const [text, setText] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const sendMessageMutation = useSendMessage();
  const { isUploading, openFilePicker, selectedFile, sendFile, clearFile } = useMediaUpload({
    chatId,
    onSuccess: () => {
      clearFile();
    },
  });

  /**
   * Auto-resize the textarea as the user types.
   */
  const handleInput = useCallback((value: string): void => {
    setText(value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, []);

  /**
   * Send a text message.
   */
  const handleSendText = useCallback(async (): Promise<void> => {
    if (!validateMessageBody(text)) return;

    try {
      await sendMessageMutation.mutateAsync({ to: chatId, message: text.trim() });
      setText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to send message';
      toast.error(message);
    }
  }, [text, chatId, sendMessageMutation]);

  /**
   * Send media file with optional caption.
   */
  const handleSendMedia = useCallback(async (): Promise<void> => {
    if (selectedFile) {
      await sendFile(text.trim() || undefined);
      setText('');
    }
  }, [selectedFile, sendFile, text]);

  /**
   * Handle Enter key (send) and Shift+Enter (newline).
   */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>): void => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (selectedFile) {
          handleSendMedia();
        } else {
          handleSendText();
        }
      }
    },
    [handleSendText, handleSendMedia, selectedFile],
  );

  const isSending = sendMessageMutation.isPending || isUploading;

  return (
    <div className="flex items-end gap-2 px-4 py-3 bg-[#f0f2f5] border-t border-gray-200 flex-shrink-0 relative z-20">
      {/* Attach media button */}
      <button
        onClick={openFilePicker}
        className="flex-shrink-0 w-10 h-10 flex items-center justify-center text-gray-600 hover:text-[#008069] transition-colors rounded-full hover:bg-gray-200 min-w-touch min-h-touch"
        type="button"
        aria-label="Attach file"
        disabled={isSending}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
        </svg>
      </button>

      {/* Selected file indicator */}
      {selectedFile && (
        <div className="flex-shrink-0 flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-gray-200 text-xs text-gray-600">
          <span>📎</span>
          <span className="truncate max-w-[80px]">{selectedFile.name}</span>
          <button
            onClick={clearFile}
            className="ml-1 text-gray-400 hover:text-red-500"
            type="button"
            aria-label="Remove file"
          >
            ×
          </button>
        </div>
      )}

      {/* Text input */}
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e): void => handleInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={selectedFile ? 'Add a caption…' : 'Type a message…'}
        rows={1}
        className="flex-1 resize-none rounded-lg border border-transparent bg-white px-4 py-2.5 text-[14.5px] focus:outline-none focus:ring-0 focus:border-transparent max-h-[120px] min-h-touch shadow-sm placeholder-gray-400"
        disabled={isSending}
      />

      {/* Send button */}
      <button
        onClick={selectedFile ? handleSendMedia : handleSendText}
        disabled={(!text.trim() && !selectedFile) || isSending}
        className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-[#008069] text-white rounded-full hover:bg-[#005e4b] transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-touch min-h-touch shadow-sm"
        type="button"
        aria-label="Send"
      >
        {isSending ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transform rotate-45 -translate-x-0.5 translate-y-0.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        )}
      </button>
    </div>
  );
}