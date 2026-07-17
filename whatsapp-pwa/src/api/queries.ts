import { useQuery, useInfiniteQuery, useMutation, useQueryClient, UseQueryResult, UseInfiniteQueryResult, UseMutationResult, InfiniteData } from '@tanstack/react-query';
import { client } from './client';
import { ClientStateResponse, ChatDto, MessageDto, CheckResponse } from './types';

export function useChat(
  id: string,
  options?: { enabled?: boolean }
): UseQueryResult<ChatDto, Error> {
  return useQuery<ChatDto, Error>({
    queryKey: ['chat', id],
    queryFn: async (): Promise<ChatDto> => {
      const response = await client.get<ChatDto>(`/chats/${id}`);
      return response.data;
    },
    enabled: !!id && options?.enabled !== false,
  });
}

export function useChatMessages(
  id: string,
  offset: number,
  options?: { enabled?: boolean; refetchInterval?: number | false }
): UseQueryResult<MessageDto[], Error> {
  return useQuery<MessageDto[], Error>({
    queryKey: ['messages', id, offset],
    queryFn: async (): Promise<MessageDto[]> => {
      const response = await client.get<MessageDto[]>(`/chats/${id}/messages?limit=50&offset=${offset}`);
      return response.data;
    },
    enabled: !!id && options?.enabled !== false,
    refetchInterval: options?.refetchInterval,
    staleTime: offset > 0 ? Infinity : undefined, // older pages are static
  });
}

export function useMarkAsRead(): UseMutationResult<{ success: boolean }, Error, string> {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, string>({
    mutationFn: async (id: string): Promise<{ success: boolean }> => {
      const response = await client.post<{ success: boolean }>(`/chats/${id}/read`);
      return response.data;
    },
    onSuccess: (_, id) => {
      // Invalidate chats list to clear unread badge
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      // Also invalidate the specific chat query
      queryClient.invalidateQueries({ queryKey: ['chat', id] });
    },
  });
}

export function useSendText(): UseMutationResult<MessageDto, Error, { chatId: string; message: string }> {
  return useMutation<MessageDto, Error, { chatId: string; message: string }>({
    mutationFn: async ({ chatId, message }): Promise<MessageDto> => {
      const response = await client.post<MessageDto>('/messages/send-text', { chatId, message });
      return response.data;
    },
  });
}

export function useSendMedia(): UseMutationResult<MessageDto, Error, { chatId: string; file: File }> {
  return useMutation<MessageDto, Error, { chatId: string; file: File }>({
    mutationFn: async ({ chatId, file }): Promise<MessageDto> => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await client.post<MessageDto>(`/messages/${chatId}/send-media`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
  });
}

export function useClientState(options?: {
  enabled?: boolean;
  refetchInterval?: number | false;
}): UseQueryResult<ClientStateResponse, Error> {
  return useQuery<ClientStateResponse, Error>({
    queryKey: ['clientState'],
    queryFn: async (): Promise<ClientStateResponse> => {
      const response = await client.get<ClientStateResponse>('/client/state');
      return response.data;
    },
    ...options,
  });
}

export function useInfiniteChats(options?: {
  refetchInterval?: number | false;
}): UseInfiniteQueryResult<InfiniteData<ChatDto[], number>, Error> {
  return useInfiniteQuery<ChatDto[], Error, InfiniteData<ChatDto[], number>, readonly unknown[], number>({
    queryKey: ['chats'],
    queryFn: async ({ pageParam }): Promise<ChatDto[]> => {
      const offset = pageParam;
      const response = await client.get<ChatDto[]>(`/chats/list?limit=50&offset=${offset}`);
      return response.data;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages): number | undefined => {
      if (lastPage.length === 50) {
        return allPages.length * 50;
      }
      return undefined;
    },
    refetchInterval: options?.refetchInterval ?? 5000,
  });
}

// NOTE: Avatar images are no longer fetched as a JSON string URL via a
// dedicated query hook. The `/avatar/{id}` endpoint now streams raw,
// unencrypted image bytes directly, so avatars are loaded with
// `useAuthedBlob` (see `components/ui/Avatar.tsx`) just like other media.

export function useCheckPhone(): UseMutationResult<CheckResponse, Error, string> {
  return useMutation<CheckResponse, Error, string>({
    mutationFn: async (phone: string): Promise<CheckResponse> => {
      const response = await client.get<CheckResponse>(`/check?phone=${encodeURIComponent(phone)}`);
      return response.data;
    },
  });
}
