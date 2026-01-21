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

export function getStatusTextColor(status: string): string {
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus === 'running') return 'text-green-600';
  if (normalizedStatus === 'pending') return 'text-yellow-600';
  if (normalizedStatus === 'failed' || normalizedStatus === 'error') return 'text-red-600';
  if (normalizedStatus === 'terminating') return 'text-orange-600';
  if (normalizedStatus === 'succeeded' || normalizedStatus === 'completed') return 'text-blue-600';
  if (normalizedStatus.includes('crash') || normalizedStatus.includes('backoff')) return 'text-red-600';

  return 'text-gray-600';
}
