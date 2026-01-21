import { useState, useEffect } from 'react';
import type { ConfigMap } from '@/types/k8s';

export function useConfigMaps(namespace: string = 'all', contextVersion: number = 0) {
  const [configmaps, setConfigMaps] = useState<ConfigMap[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfigMaps = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const url = namespace === 'all' || namespace === ''
          ? 'http://localhost:8080/api/configmaps'
          : `http://localhost:8080/api/configmaps?namespace=${namespace}`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to fetch configmaps');
        }
        const data = await response.json();
        setConfigMaps(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfigMaps();
  }, [namespace, contextVersion]);

  return { configmaps, isLoading, error };
}
