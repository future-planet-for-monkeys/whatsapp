import { useQuery, useInfiniteQuery, useMutation, useQueryClient, UseQueryResult, UseInfiniteQueryResult, UseMutationResult, InfiniteData } from '@tanstack/react-query';
import { client } from './client';
import { ClientStateResponse, ChatDto, MessageDto, CheckResponse, ContactDto, LabelDto, SaveContactRequest, UpdateChatLabelsRequest } from './types';

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

export function useMarkAsRead(): UseMutationResult<{ success: boolean }, Error, string, { previousChat?: ChatDto }> {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, string, { previousChat?: ChatDto }>({
    mutationFn: async (id: string): Promise<{ success: boolean }> => {
      const response = await client.post<{ success: boolean }>(`/chats/${id}/read`);
      return response.data;
    },
    onMutate: async (id) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['chat', id] });

      // Snapshot the previous value
      const previousChat = queryClient.getQueryData<ChatDto>(['chat', id]);

      // Optimistically update to the new value
      if (previousChat) {
        queryClient.setQueryData<ChatDto>(['chat', id], {
          ...previousChat,
          unreadCount: 0,
        });
      }

      // Return a context object with the snapshotted value
      return { previousChat };
    },
    onError: (_err, id, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousChat) {
        queryClient.setQueryData<ChatDto>(['chat', id], context.previousChat);
      }
    },
    onSuccess: (_, id) => {
      // Invalidate chats list to clear unread badge
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      // Also invalidate the specific chat query to ensure we are in sync with server
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

export function useEditMessage(): UseMutationResult<MessageDto, Error, { id: string; newBody: string }> {
  const queryClient = useQueryClient();
  return useMutation<MessageDto, Error, { id: string; newBody: string }>({
    mutationFn: async ({ id, newBody }): Promise<MessageDto> => {
      const response = await client.post<MessageDto>(`/messages/${id}/edit`, { newBody });
      return response.data;
    },
    onSuccess: () => {
      // Invalidate messages for the chat to get the updated message list
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
  });
}

export function useDeleteMessage(): UseMutationResult<MessageDto, Error, string> {
  const queryClient = useQueryClient();
  return useMutation<MessageDto, Error, string>({
    mutationFn: async (id: string): Promise<MessageDto> => {
      const response = await client.post<MessageDto>(`/messages/${id}/delete`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
  });
}

export function useReactToMessage(): UseMutationResult<MessageDto, Error, { id: string; emoji: string }> {
  const queryClient = useQueryClient();
  return useMutation<MessageDto, Error, { id: string; emoji: string }>({
    mutationFn: async ({ id, emoji }): Promise<MessageDto> => {
      const response = await client.post<MessageDto>(`/messages/${id}/react`, { emoji });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });
}

export function useContact(
  chatId: string,
  options?: { enabled?: boolean }
): UseQueryResult<ContactDto, Error> {
  return useQuery<ContactDto, Error>({
    queryKey: ['contact', chatId],
    queryFn: async (): Promise<ContactDto> => {
      const response = await client.get<ContactDto>(`/contacts/${chatId}`);
      return response.data;
    },
    enabled: !!chatId && options?.enabled !== false,
  });
}

export function useSaveContact(chatId: string): UseMutationResult<ContactDto, Error, SaveContactRequest> {
  const queryClient = useQueryClient();
  return useMutation<ContactDto, Error, SaveContactRequest>({
    mutationFn: async (body: SaveContactRequest): Promise<ContactDto> => {
      const response = await client.post<ContactDto>(`/contacts/${chatId}/save`, body);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['contact', chatId], data);
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
  });
}

export function useDeleteContact(chatId: string): UseMutationResult<ContactDto, Error, void> {
  const queryClient = useQueryClient();
  return useMutation<ContactDto, Error, void>({
    mutationFn: async (): Promise<ContactDto> => {
      const response = await client.post<ContactDto>(`/contacts/${chatId}/delete`);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['contact', chatId], data);
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
  });
}

export function useLabels(options?: { enabled?: boolean }): UseQueryResult<LabelDto[], Error> {
  return useQuery<LabelDto[], Error>({
    queryKey: ['labels'],
    queryFn: async (): Promise<LabelDto[]> => {
      const response = await client.get<LabelDto[]>('/labels');
      return response.data;
    },
    enabled: options?.enabled !== false,
  });
}

export function useChatLabels(
  chatId: string,
  options?: { enabled?: boolean }
): UseQueryResult<LabelDto[], Error> {
  return useQuery<LabelDto[], Error>({
    queryKey: ['chatLabels', chatId],
    queryFn: async (): Promise<LabelDto[]> => {
      const response = await client.get<LabelDto[]>(`/chats/${chatId}/labels`);
      return response.data;
    },
    enabled: !!chatId && options?.enabled !== false,
  });
}

export function useUpdateChatLabels(chatId: string): UseMutationResult<LabelDto[], Error, UpdateChatLabelsRequest> {
  const queryClient = useQueryClient();
  return useMutation<LabelDto[], Error, UpdateChatLabelsRequest>({
    mutationFn: async (body: UpdateChatLabelsRequest): Promise<LabelDto[]> => {
      const response = await client.post<LabelDto[]>(`/chats/${chatId}/labels`, body);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['chatLabels', chatId], data);
    },
  });
}
