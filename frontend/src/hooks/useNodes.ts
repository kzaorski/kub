import { useState, useEffect } from 'react';
import { getApiUrl } from '@/lib/api';
import type { Node } from '@/types/k8s';

export function useNodes(contextVersion: number = 0) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchNodes = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(getApiUrl('/api/nodes'), {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error('Failed to fetch nodes');
        }
        const data = await response.json();
        setNodes(data);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchNodes();
    return () => controller.abort();
  }, [contextVersion]);

  return { nodes, isLoading, error };
}
