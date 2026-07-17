import { useSendMedia } from '../api/queries';
import { MessageDto } from '../api/types';
import { UseMutationResult } from '@tanstack/react-query';

export function useMediaUpload(): {
  uploadMedia: (chatId: string, file: File) => Promise<MessageDto>;
  isLoading: boolean;
  error: Error | null;
  mutation: UseMutationResult<MessageDto, Error, { chatId: string; file: File }>;
} {
  const mutation = useSendMedia();

  const uploadMedia = async (chatId: string, file: File): Promise<MessageDto> => {
    return mutation.mutateAsync({ chatId, file });
  };

  return {
    uploadMedia,
    isLoading: mutation.isPending,
    error: mutation.error,
    mutation,
  };
}
