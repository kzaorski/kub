import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { getApiUrl } from '@/lib/api';
import type { Pod, LogOptions } from '@/types/k8s';

// Max chunks before consolidation (prevents unbounded growth)
const MAX_LOG_CHUNKS = 10000;
// Number of old chunks to consolidate when limit is reached
const CONSOLIDATE_THRESHOLD = 2000;

interface UseLogStreamResult {
  logs: string;
  containers: string[];
  isLoading: boolean;
  error: string | null;
  isStreaming: boolean;
  fetchLogs: (options: LogOptions) => Promise<void>;
  startStream: (options: LogOptions) => void;
  stopStream: () => void;
  downloadLogs: () => void;
}

export function useLogStream(pod: Pod): UseLogStreamResult {
  // Use array of chunks to avoid O(n²) string concatenation
  const [logChunks, setLogChunks] = useState<string[]>([]);
  const [containers, setContainers] = useState<string[]>([]);

  // Memoize the joined logs string
  const logs = useMemo(() => logChunks.join(''), [logChunks]);

  // Append a log chunk efficiently
  const appendLogChunk = useCallback((chunk: string) => {
    setLogChunks((prev) => {
      if (prev.length >= MAX_LOG_CHUNKS) {
        // Consolidate old chunks to prevent memory growth
        const consolidated = prev.slice(CONSOLIDATE_THRESHOLD).join('');
        return [consolidated, chunk];
      }
      return [...prev, chunk];
    });
  }, []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopStream();
    };
  }, []);

  // Fetch containers for the pod
  const fetchContainers = useCallback(async () => {
    try {
      const response = await fetch(
        getApiUrl(`/api/pods/${pod.namespace}/${pod.name}/containers`)
      );
      if (!response.ok) {
        throw new Error('Failed to fetch containers');
      }
      const data = await response.json();
      setContainers(data.containers || []);
    } catch (err) {
      console.error('Failed to fetch containers:', err);
    }
  }, [pod.namespace, pod.name]);

  // Fetch containers on mount and when pod changes
  useEffect(() => {
    fetchContainers();
  }, [fetchContainers]);

  // Fetch static logs
  const fetchLogs = useCallback(async (options: LogOptions) => {
    if (!mountedRef.current) return;

    setIsLoading(true);
    setError(null);

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const params = new URLSearchParams();
      if (options.container) params.append('container', options.container);
      if (options.tailLines !== undefined) {
        params.append('tailLines', options.tailLines.toString());
      }
      if (options.previous) params.append('previous', 'true');
      if (options.timestamps) params.append('timestamps', 'true');

      const response = await fetch(
        getApiUrl(`/api/pods/${pod.namespace}/${pod.name}/logs?${params}`),
        { signal: abortControllerRef.current.signal }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }

      const data = await response.json();
      if (mountedRef.current) {
        setLogChunks(data.logs ? [data.logs] : []);
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
  }, [pod.namespace, pod.name]);

  // Start WebSocket stream
  const startStream = useCallback((options: LogOptions) => {
    if (!mountedRef.current) return;

    stopStream(); // Stop any existing stream

    setIsStreaming(true);
    setError(null);
    setLogChunks([]); // Clear previous logs

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;

    const params = new URLSearchParams();
    params.append('namespace', pod.namespace);
    params.append('pod', pod.name);
    if (options.container) params.append('container', options.container);
    if (options.previous) params.append('previous', 'true');
    if (options.timestamps) params.append('timestamps', 'true');

    const url = `${protocol}//${host}/ws/logs?${params}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
    };

    ws.onmessage = (event) => {
      if (!mountedRef.current) return;
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'log') {
          appendLogChunk(message.data);
        } else if (message.type === 'error') {
          setError(message.data);
        }
      } catch (e) {
        // If not JSON, treat as raw log line
        appendLogChunk(event.data);
      }
    };

    ws.onerror = () => {
      if (!mountedRef.current) return;
      setError('WebSocket connection error');
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      setIsStreaming(false);
      wsRef.current = null;
    };
  }, [pod.namespace, pod.name, appendLogChunk]);

  // Stop WebSocket stream
  const stopStream = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  // Download logs as file
  const downloadLogs = useCallback(() => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `${pod.name}-${timestamp}.log`;

    const blob = new Blob([logs], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [pod.name, logs]);

  return {
    logs,
    containers,
    isLoading,
    error,
    isStreaming,
    fetchLogs,
    startStream,
    stopStream,
    downloadLogs,
  };
}
