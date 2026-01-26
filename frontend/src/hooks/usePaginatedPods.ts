import { useState, useCallback, useRef, useEffect } from 'react';
import { getApiUrl } from '@/lib/api';
import type { Pod, PaginatedPods } from '@/types/k8s';

interface UsePaginatedPodsResult {
  pods: Pod[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  totalCount: number;
  loadMore: () => Promise<void>;
  reset: () => void;
}

export function usePaginatedPods(
  namespace: string,
  pageSize = 100
): UsePaginatedPodsResult {
  const [pods, setPods] = useState<Pod[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const continueTokenRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Reset when namespace changes
  useEffect(() => {
    setPods([]);
    setHasMore(true);
    setTotalCount(0);
    setError(null);
    continueTokenRef.current = null;
  }, [namespace]);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore || !mountedRef.current) return;

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        namespace: namespace || '',
        limit: pageSize.toString(),
      });

      if (continueTokenRef.current) {
        params.append('continue', continueTokenRef.current);
      }

      const response = await fetch(
        getApiUrl(`/api/pods/paginated?${params}`),
        { signal: abortControllerRef.current.signal }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch pods');
      }

      const data: PaginatedPods = await response.json();

      if (mountedRef.current) {
        setPods((prev) => [...prev, ...data.pods]);
        setHasMore(data.hasMore);
        setTotalCount((prev) => prev + data.totalCount);
        continueTokenRef.current = data.continueToken || null;
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError' && mountedRef.current) {
        setError(err.message);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
      abortControllerRef.current = null;
    }
  }, [namespace, pageSize, isLoading, hasMore]);

  const reset = useCallback(() => {
    setPods([]);
    setHasMore(true);
    setTotalCount(0);
    setError(null);
    continueTokenRef.current = null;
  }, []);

  return {
    pods,
    isLoading,
    error,
    hasMore,
    totalCount,
    loadMore,
    reset,
  };
}
