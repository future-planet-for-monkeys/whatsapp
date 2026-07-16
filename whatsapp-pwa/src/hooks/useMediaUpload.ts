import { useCallback, useRef, useState } from 'react';
import { useSendMedia } from '../api/queries';
import { validateFileSize } from '../utils/validators';
import toast from 'react-hot-toast';

export interface UseMediaUploadOptions {
  /** Chat ID to send media to */
  chatId: string;
  /** Called after successful upload */
  onSuccess?: () => void;
}

export interface UseMediaUploadReturn {
  /** Whether a file upload is in progress */
  isUploading: boolean;
  /** The selected file, or null */
  selectedFile: File | null;
  /** Open the native file picker */
  openFilePicker: () => void;
  /** Send the selected file */
  sendFile: (caption?: string) => Promise<void>;
  /** Clear the selected file */
  clearFile: () => void;
}

/**
 * Hook that manages media file selection and upload.
 */
export function useMediaUpload({ chatId, onSuccess }: UseMediaUploadOptions): UseMediaUploadReturn {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const sendMediaMutation = useSendMedia();

  const openFilePicker = useCallback((): void => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt';
    input.onchange = (event: Event): void => {
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        if (!validateFileSize(file)) {
          toast.error('File too large. Maximum size is 64 MB.');
          return;
        }
        setSelectedFile(file);
      }
    };
    input.click();
    fileInputRef.current = input;
  }, []);

  const sendFile = useCallback(
    async (caption?: string): Promise<void> => {
      if (!selectedFile) return;

      const formData = new FormData();
      formData.append('to', chatId);
      formData.append('file', selectedFile);
      if (caption) {
        formData.append('caption', caption);
      }

      try {
        await sendMediaMutation.mutateAsync(formData);
        setSelectedFile(null);
        onSuccess?.();
        toast.success('Media sent');
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to send media';
        toast.error(message);
      }
    },
    [selectedFile, chatId, sendMediaMutation, onSuccess],
  );

  const clearFile = useCallback((): void => {
    setSelectedFile(null);
  }, []);

  return {
    isUploading: sendMediaMutation.isPending,
    selectedFile,
    openFilePicker,
    sendFile,
    clearFile,
  };
}