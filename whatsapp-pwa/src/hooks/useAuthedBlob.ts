import { useState, useEffect } from 'react';
import { client } from '../api/client';

export interface UseAuthedBlobResult {
  objectUrl: string | null;
  isLoading: boolean;
  error: Error | null;
}

export function useAuthedBlob(url: string | null): UseAuthedBlobResult {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!url) {
      setObjectUrl(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    let active = true;
    let createdUrl: string | null = null;
    const abortController = new AbortController();

    const fetchBlob = async (): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await client.get<Blob>(url, {
          responseType: 'blob',
          signal: abortController.signal,
        });

        if (active) {
          createdUrl = URL.createObjectURL(response.data);
          setObjectUrl(createdUrl);
          setIsLoading(false);
        }
      } catch (err: unknown) {
        if (active) {
          // Axios cancel error check
          if (err && typeof err === 'object' && 'name' in err && err.name === 'CanceledError') {
            return;
          }
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      }
    };

    fetchBlob();

    return () => {
      active = false;
      abortController.abort();
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [url]);

  return { objectUrl, isLoading, error };
}
