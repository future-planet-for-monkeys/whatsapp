import { useQuery, useInfiniteQuery, useMutation, type UseQueryResult, type UseInfiniteQueryResult, type UseMutationResult, type InfiniteData } from '@tanstack/react-query';
import apiClient from './client';
import type {
  StatusResponse,
  HealthResponse,
  QrJsonResponse,
  ChatsResponse,
  MessagesResponse,
  ContactsResponse,
  PhoneCheckResponse,
  SaveContactBody,
  SaveContactResponse,
  SendMessageBody,
  MessageSentResponse,
  MediaSentResponse,
} from './types';

// ── Status & Health ──────────────────────────────────────────────────────────

export function useStatus(): UseQueryResult<StatusResponse> {
  return useQuery<StatusResponse>({
    queryKey: ['status'],
    queryFn: async (): Promise<StatusResponse> => {
      const { data } = await apiClient.get<StatusResponse>('/status');
      return data;
    },
    retry: false,
    refetchInterval: (query) => {
      const state = query.state.data;
      if (!state || state.status === 'initializing' || state.status === 'qr_ready' || state.status === 'authenticated') {
        return 2000;
      }
      return false;
    },
  });
}

export function useHealth(): UseQueryResult<HealthResponse> {
  return useQuery<HealthResponse>({
    queryKey: ['health'],
    queryFn: async (): Promise<HealthResponse> => {
      const { data } = await apiClient.get<HealthResponse>('/health');
      return data;
    },
    retry: false,
  });
}

// ── QR Code ──────────────────────────────────────────────────────────────────

export function useQrCode(): UseQueryResult<QrJsonResponse> {
  return useQuery<QrJsonResponse>({
    queryKey: ['qr'],
    queryFn: async (): Promise<QrJsonResponse> => {
      const { data } = await apiClient.get<QrJsonResponse>('/qr?format=json');
      return data;
    },
    retry: false,
    refetchInterval: 1000,
  });
}

// ── Chats ────────────────────────────────────────────────────────────────────

export function useChats(): UseInfiniteQueryResult<InfiniteData<ChatsResponse>> {
  return useInfiniteQuery<ChatsResponse>({
    queryKey: ['chats'],
    queryFn: async ({ pageParam }): Promise<ChatsResponse> => {
      const offset = pageParam as number;
      const { data } = await apiClient.get<ChatsResponse>('/chats', {
        params: { limit: 50, offset },
      });
      return data;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam): number | undefined => {
      if (!lastPage.hasMore) return undefined;
      return (lastPageParam as number) + 50;
    },
  });
}

// ── Messages ─────────────────────────────────────────────────────────────────

export function useMessages(chatId: string): UseInfiniteQueryResult<InfiniteData<MessagesResponse>> {
  return useInfiniteQuery<MessagesResponse>({
    queryKey: ['messages', chatId],
    queryFn: async ({ pageParam }): Promise<MessagesResponse> => {
      const before = pageParam as number | undefined;
      const { data } = await apiClient.get<MessagesResponse>(`/chats/${encodeURIComponent(chatId)}/messages`, {
        params: { limit: 50, ...(before !== undefined ? { before } : {}) },
      });
      return data;
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage): number | undefined => {
      if (!lastPage.hasMore || lastPage.messages.length === 0) return undefined;
      const oldest = lastPage.messages.reduce((min, m) => (m.timestamp < min ? m.timestamp : min), lastPage.messages[0]?.timestamp ?? 0);
      return oldest;
    },
    enabled: chatId.length > 0,
  });
}

// ── Contacts ─────────────────────────────────────────────────────────────────

export function useContacts(): UseQueryResult<ContactsResponse> {
  return useQuery<ContactsResponse>({
    queryKey: ['contacts'],
    queryFn: async (): Promise<ContactsResponse> => {
      const { data } = await apiClient.get<ContactsResponse>('/contacts');
      return data;
    },
  });
}

export function useCheckPhone(): UseMutationResult<PhoneCheckResponse, Error, string> {
  return useMutation<PhoneCheckResponse, Error, string>({
    mutationFn: async (phone: string): Promise<PhoneCheckResponse> => {
      const { data } = await apiClient.get<PhoneCheckResponse>('/contacts/check', {
        params: { phone },
      });
      return data;
    },
  });
}

export function useSaveContact(): UseMutationResult<SaveContactResponse, Error, SaveContactBody> {
  return useMutation<SaveContactResponse, Error, SaveContactBody>({
    mutationFn: async (body: SaveContactBody): Promise<SaveContactResponse> => {
      const { data } = await apiClient.post<SaveContactResponse>('/contacts', body);
      return data;
    },
  });
}

// ── Send ─────────────────────────────────────────────────────────────────────

export function useSendMessage(): UseMutationResult<MessageSentResponse, Error, SendMessageBody> {
  return useMutation<MessageSentResponse, Error, SendMessageBody>({
    mutationFn: async (body: SendMessageBody): Promise<MessageSentResponse> => {
      const { data } = await apiClient.post<MessageSentResponse>('/send', body);
      return data;
    },
  });
}

export function useSendMedia(): UseMutationResult<MediaSentResponse, Error, FormData> {
  return useMutation<MediaSentResponse, Error, FormData>({
    mutationFn: async (formData: FormData): Promise<MediaSentResponse> => {
      const { data } = await apiClient.post<MediaSentResponse>('/send-media', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
  });
}

// ── Mark as read ─────────────────────────────────────────────────────────────

export function useMarkAsRead(): UseMutationResult<void, Error, string> {
  return useMutation<void, Error, string>({
    mutationFn: async (chatId: string): Promise<void> => {
      await apiClient.post(`/chats/${encodeURIComponent(chatId)}/read`);
    },
    retry: 1,
  });
}

// ── Avatar ───────────────────────────────────────────────────────────────────

/**
 * Fetch the avatar URL for a contact. Returns the blob URL or null on failure.
 * This is meant to be used directly in components, not through React Query,
 * since we want to handle 404s gracefully (fall back to initials).
 */
export async function fetchAvatar(contactId: string): Promise<string | null> {
  try {
    const response = await apiClient.get(`/contacts/${encodeURIComponent(contactId)}/avatar`, {
      responseType: 'blob',
    });
    return URL.createObjectURL(response.data as Blob);
  } catch {
    return null;
  }
}

// ── Media download ───────────────────────────────────────────────────────────

export function getMediaDownloadUrl(messageId: string): string {
  return `/api/messages/${encodeURIComponent(messageId)}/media`;
}