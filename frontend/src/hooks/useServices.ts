import { useState, useEffect } from 'react';
import { getApiUrl } from '@/lib/api';
import type { Service } from '@/types/k8s';

export function useServices(namespace: string = 'all', contextVersion: number = 0) {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchServices = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const url = namespace === 'all' || namespace === ''
          ? getApiUrl('/api/services')
          : getApiUrl(`/api/services?namespace=${namespace}`);
        const response = await fetch(url, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error('Failed to fetch services');
        }
        const data = await response.json();
        setServices(data);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchServices();
    return () => controller.abort();
  }, [namespace, contextVersion]);

  return { services, isLoading, error };
}
