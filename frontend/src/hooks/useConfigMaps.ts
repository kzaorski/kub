import { useState, useEffect } from 'react';
import { getApiUrl } from '@/lib/api';
import type { ConfigMap } from '@/types/k8s';

export function useConfigMaps(namespace: string = 'all', contextVersion: number = 0) {
  const [configmaps, setConfigMaps] = useState<ConfigMap[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchConfigMaps = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const url = namespace === 'all' || namespace === ''
          ? getApiUrl('/api/configmaps')
          : getApiUrl(`/api/configmaps?namespace=${namespace}`);
        const response = await fetch(url, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error('Failed to fetch configmaps');
        }
        const data = await response.json();
        setConfigMaps(data);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchConfigMaps();
    return () => controller.abort();
  }, [namespace, contextVersion]);

  return { configmaps, isLoading, error };
}
