import { useState, useEffect, useCallback, useRef } from "react";
import { getApiUrl } from "@/lib/api";
import type { Event, DescribableResource } from "@/types/k8s";

interface UseEventsOptions {
  resourceType: DescribableResource;
  resourceName: string;
  namespace: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  enabled?: boolean;
}

interface UseEventsResult {
  events: Event[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  warningCount: number;
  normalCount: number;
}

export function useEvents({
  resourceType,
  resourceName,
  namespace,
  autoRefresh = false,
  refreshInterval = 5000,
  enabled = true
}: UseEventsOptions): UseEventsResult {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!enabled || !resourceName) return;

    // For nodes, events are typically in all namespaces or default
    const eventNs = resourceType === 'Node' ? 'default' : namespace;

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        getApiUrl(`/api/events/${eventNs}/${resourceType}/${resourceName}`),
        { signal: abortControllerRef.current.signal }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch events: ${response.status}`);
      }

      const data = await response.json();
      setEvents(data || []);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Ignore aborted requests
      }
      setError(err instanceof Error ? err.message : 'Failed to fetch events');
    } finally {
      setLoading(false);
    }
  }, [resourceType, resourceName, namespace, enabled]);

  // Initial fetch and auto-refresh setup
  useEffect(() => {
    if (!enabled) {
      setEvents([]);
      return;
    }

    fetchEvents();

    if (autoRefresh && refreshInterval > 0) {
      intervalRef.current = setInterval(fetchEvents, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchEvents, autoRefresh, refreshInterval, enabled]);

  // Calculate counts
  const warningCount = events.filter(e => e.type === 'Warning').length;
  const normalCount = events.filter(e => e.type === 'Normal').length;

  return {
    events,
    loading,
    error,
    refetch: fetchEvents,
    warningCount,
    normalCount
  };
}
