import { useQuery, useInfiniteQuery, UseQueryResult, UseInfiniteQueryResult, InfiniteData } from '@tanstack/react-query';
import { client } from './client';
import { ClientStateResponse, ChatDto } from './types';

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

export function useLazyAvatar(
  lid: string | null,
  options?: { enabled?: boolean }
): UseQueryResult<string, Error> {
  return useQuery<string, Error>({
    queryKey: ['avatar', lid],
    queryFn: async (): Promise<string> => {
      if (!lid) throw new Error('No lid provided');
      const response = await client.get<string>(`/avatar/${lid}`);
      return response.data;
    },
    staleTime: 3600000, // 1 hour
    enabled: !!lid && options?.enabled !== false,
  });
}
