import { useState, useCallback, useRef, useEffect } from 'react';
import type { Pod, PodEvent, WebSocketMessage, ClusterSummary, MetricsSnapshot } from '@/types/k8s';
import { useWebSocket } from './useWebSocket';

interface PodWithAnimation extends Pod {
  animationClass?: string;
}

export function usePods(namespace: string = '', contextVersion: number = 0) {
  const [pods, setPods] = useState<PodWithAnimation[]>([]);
  const [summary, setSummary] = useState<ClusterSummary | null>(null);
  const [metrics, setMetrics] = useState<MetricsSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const animationTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Clear state when context changes
  useEffect(() => {
    if (contextVersion > 0) {
      setPods([]);
      setSummary(null);
      setMetrics(null);
      setIsLoading(true);
      setError(null);
    }
  }, [contextVersion]);

  const clearAnimationClass = useCallback((podKey: string) => {
    setPods(prev => prev.map(p => {
      if (`${p.namespace}/${p.name}` === podKey) {
        return { ...p, animationClass: undefined };
      }
      return p;
    }));
  }, []);

  const handlePodEvent = useCallback((event: PodEvent) => {
    const podKey = `${event.pod.namespace}/${event.pod.name}`;

    // Clear any existing animation timeout for this pod
    const existingTimeout = animationTimeoutsRef.current.get(podKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    setPods(prev => {
      switch (event.type) {
        case 'ADDED': {
          const exists = prev.some(p =>
            p.namespace === event.pod.namespace && p.name === event.pod.name
          );
          if (exists) {
            return prev.map(p => {
              if (p.namespace === event.pod.namespace && p.name === event.pod.name) {
                return { ...event.pod, animationClass: 'pod-update' };
              }
              return p;
            });
          }
          return [...prev, { ...event.pod, animationClass: 'pod-enter' }];
        }
        case 'MODIFIED': {
          return prev.map(p => {
            if (p.namespace === event.pod.namespace && p.name === event.pod.name) {
              return { ...event.pod, animationClass: 'pod-update' };
            }
            return p;
          });
        }
        case 'DELETED': {
          return prev.map(p => {
            if (p.namespace === event.pod.namespace && p.name === event.pod.name) {
              return { ...p, animationClass: 'pod-exit' };
            }
            return p;
          });
        }
        default:
          return prev;
      }
    });

    // Schedule animation cleanup
    const timeout = setTimeout(() => {
      if (event.type === 'DELETED') {
        setPods(prev => prev.filter(p =>
          !(p.namespace === event.pod.namespace && p.name === event.pod.name)
        ));
      } else {
        clearAnimationClass(podKey);
      }
      animationTimeoutsRef.current.delete(podKey);
    }, event.type === 'DELETED' ? 500 : 1000);

    animationTimeoutsRef.current.set(podKey, timeout);
  }, [clearAnimationClass]);

  const handleMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case 'pods':
        setPods(message.data as Pod[]);
        setIsLoading(false);
        break;
      case 'pod':
        handlePodEvent(message.data as PodEvent);
        break;
      case 'summary':
        setSummary(message.data as ClusterSummary);
        break;
      case 'metrics':
        setMetrics(message.data as MetricsSnapshot);
        break;
    }
  }, [handlePodEvent]);

  const { isConnected } = useWebSocket({
    namespace,
    contextVersion,
    onMessage: handleMessage,
    onConnect: () => {
      setError(null);
    },
    onError: () => {
      setError('WebSocket connection error');
    },
    onDisconnect: () => {
      // Connection lost, will reconnect automatically
    },
  });

  // Cleanup animation timeouts on unmount
  useEffect(() => {
    return () => {
      animationTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      animationTimeoutsRef.current.clear();
    };
  }, []);

  return {
    pods,
    summary,
    metrics,
    isLoading,
    error,
    isConnected,
  };
}
