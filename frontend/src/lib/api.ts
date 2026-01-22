// Centralized API URL construction
// Uses window.location to automatically handle different environments

export function getApiBaseUrl(): string {
  const protocol = window.location.protocol;
  const host = window.location.host;
  return `${protocol}//${host}`;
}

export function getApiUrl(path: string): string {
  return `${getApiBaseUrl()}${path}`;
}
