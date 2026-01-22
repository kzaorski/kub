import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'Ki', 'Mi', 'Gi', 'Ti'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatMillicores(millicores: number): string {
  if (millicores >= 1000) {
    return `${(millicores / 1000).toFixed(1)} cores`;
  }
  return `${millicores}m`;
}

// Badge variant type for consistent typing across components
export type StatusVariant = 'default' | 'success' | 'warning' | 'error' | 'secondary';

export function getStatusColor(status: string): string {
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus === 'running') return 'bg-green-500';
  if (normalizedStatus === 'pending') return 'bg-yellow-500';
  if (normalizedStatus === 'failed' || normalizedStatus === 'error') return 'bg-red-500';
  if (normalizedStatus === 'terminating') return 'bg-orange-500';
  if (normalizedStatus === 'succeeded' || normalizedStatus === 'completed') return 'bg-blue-500';
  if (normalizedStatus.includes('crash') || normalizedStatus.includes('backoff')) return 'bg-red-500';
  if (normalizedStatus.includes('creating') || normalizedStatus.includes('init')) return 'bg-blue-400';

  return 'bg-gray-500';
}

// Pod status helpers
export function getPodStatusVariant(status: string): StatusVariant {
  const normalizedStatus = status.toLowerCase();
  if (normalizedStatus === 'running') return 'success';
  if (normalizedStatus === 'pending') return 'warning';
  if (normalizedStatus.includes('imagepull') || normalizedStatus.includes('registry')) return 'warning';
  if (normalizedStatus === 'failed' || normalizedStatus === 'error' || normalizedStatus.includes('crash')) return 'error';
  return 'secondary';
}

export function getContainerStatusVariant(state: string): StatusVariant {
  const s = state.toLowerCase();
  if (s === 'running') return 'success';
  if (s === 'completed') return 'secondary';
  if (s.includes('error') || s.includes('crash') || s.includes('oom') || s.includes('failed')) return 'error';
  return 'warning';
}

// Node status helpers
export function getNodeStatusVariant(status: string): StatusVariant {
  if (status === 'Ready') return 'success';
  if (status === 'NotReady') return 'error';
  return 'warning';
}

export function getNodeStatusColor(status: string): string {
  if (status === 'Ready') return 'bg-green-500';
  if (status === 'NotReady') return 'bg-red-500';
  return 'bg-yellow-500';
}

// Deployment status helpers
export interface DeploymentStatus {
  isReady: boolean;
  isProgressing: boolean;
}

export function getDeploymentStatus(readyReplicas: number, replicas: number): DeploymentStatus {
  return {
    isReady: readyReplicas === replicas && replicas > 0,
    isProgressing: readyReplicas < replicas && readyReplicas > 0,
  };
}

export function getDeploymentStatusVariant(readyReplicas: number, replicas: number): StatusVariant {
  const { isReady, isProgressing } = getDeploymentStatus(readyReplicas, replicas);
  if (isReady) return 'success';
  if (isProgressing) return 'warning';
  if (replicas === 0) return 'secondary';
  return 'error';
}

export function getDeploymentStatusText(readyReplicas: number, replicas: number): string {
  const { isReady, isProgressing } = getDeploymentStatus(readyReplicas, replicas);
  if (isReady) return 'Ready';
  if (isProgressing) return 'Progressing';
  if (replicas === 0) return 'No replicas';
  return 'Not Ready';
}

export function getDeploymentStatusColor(readyReplicas: number, replicas: number): string {
  const { isReady, isProgressing } = getDeploymentStatus(readyReplicas, replicas);
  if (isReady) return 'bg-green-500';
  if (isProgressing) return 'bg-yellow-500';
  return 'bg-gray-400';
}

