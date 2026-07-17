import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { client } from './client';
import { ClientStateResponse } from './types';

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
