import React, { useState, useRef, useEffect } from 'react';

interface MessageInputProps {
  onSendText: (text: string) => Promise<void>;
  onSendFile: (file: File) => Promise<void>;
  disabled?: boolean;
}

export default function MessageInput({
  onSendText,
  onSendFile,
  disabled = false,
}: MessageInputProps): React.ReactElement {
  const [text, setText] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSending, setIsSending] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const adjustHeight = (): void => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 140)}px`;
  };

  useEffect(() => {
    adjustHeight();
  }, [text]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    setText(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleRemoveFile = (): void => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = async (): Promise<void> => {
    const trimmedText = text.trim();
    if (!selectedFile && !trimmedText) return;
    if (isSending || disabled) return;

    setIsSending(true);
    try {
      if (selectedFile) {
        await onSendFile(selectedFile);
        handleRemoveFile();
      } else if (trimmedText) {
        await onSendText(trimmedText);
        setText('');
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
      }
    } catch (error) {
      // Error is handled by parent/toast, we just catch to prevent crash
    } finally {
      setIsSending(false);
    }
  };

  const isSendDisabled = isSending || disabled || (!selectedFile && !text.trim());

  return (
    <div className="flex flex-col bg-[#f0f2f5] border-t border-gray-200 px-4 py-2 pb-safe">
      {/* Selected File Preview Bar */}
      {selectedFile && (
        <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg mb-2 shadow-sm border border-gray-200">
          <div className="flex items-center space-x-2 min-w-0">
            <span className="text-xl">📄</span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{selectedFile.name}</p>
              <p className="text-xs text-gray-500">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          <button
            onClick={handleRemoveFile}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Input Bar */}
      <div className="flex items-end space-x-2">
        {/* Attachment Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isSending || disabled}
          className="flex-shrink-0 text-gray-600 hover:text-gray-800 p-2 rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50"
          title="Attach file"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
            />
          </svg>
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Textarea */}
        <div className="flex-1 bg-white rounded-lg px-3 py-1.5 shadow-sm border border-gray-200">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder={selectedFile ? 'Press send to upload file...' : 'Type a message'}
            disabled={isSending || disabled || !!selectedFile}
            rows={1}
            className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-sm text-gray-800 resize-none max-h-[140px] py-1"
          />
        </div>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={isSendDisabled}
          className="flex-shrink-0 bg-whatsapp-teal text-white hover:bg-opacity-90 disabled:bg-gray-300 disabled:text-gray-400 p-2.5 rounded-full transition-colors shadow-sm"
          title="Send"
        >
          {isSending ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5 transform rotate-90" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
