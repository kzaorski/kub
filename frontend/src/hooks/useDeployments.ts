import { useState, useEffect } from 'react';
import type { Deployment } from '@/types/k8s';

export function useDeployments(namespace: string = 'all', contextVersion: number = 0) {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDeployments = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const url = namespace === 'all' || namespace === ''
          ? 'http://localhost:8080/api/deployments'
          : `http://localhost:8080/api/deployments?namespace=${namespace}`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to fetch deployments');
        }
        const data = await response.json();
        setDeployments(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDeployments();
  }, [namespace, contextVersion]);

  return { deployments, isLoading, error };
}
