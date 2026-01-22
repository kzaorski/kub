import { useState, useEffect } from 'react';
import { getApiUrl } from '@/lib/api';
import type { Deployment } from '@/types/k8s';

export function useDeployments(namespace: string = 'all', contextVersion: number = 0) {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchDeployments = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const url = namespace === 'all' || namespace === ''
          ? getApiUrl('/api/deployments')
          : getApiUrl(`/api/deployments?namespace=${namespace}`);
        const response = await fetch(url, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error('Failed to fetch deployments');
        }
        const data = await response.json();
        setDeployments(data);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchDeployments();
    return () => controller.abort();
  }, [namespace, contextVersion]);

  return { deployments, isLoading, error };
}
