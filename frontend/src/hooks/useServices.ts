import { useState, useEffect } from 'react';
import type { Service } from '@/types/k8s';

export function useServices(namespace: string = 'all', contextVersion: number = 0) {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchServices = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const url = namespace === 'all' || namespace === ''
          ? 'http://localhost:8080/api/services'
          : `http://localhost:8080/api/services?namespace=${namespace}`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to fetch services');
        }
        const data = await response.json();
        setServices(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchServices();
  }, [namespace, contextVersion]);

  return { services, isLoading, error };
}
