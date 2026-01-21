export interface Pod {
  name: string;
  namespace: string;
  status: string;
  phase: string;
  ready: string;
  restarts: number;
  age: string;
  ip: string;
  node: string;
  labels: Record<string, string>;
  createdAt: string;
  containers: Container[];
  cpuUsage: number;
  memoryUsage: number;
}

export interface Container {
  name: string;
  image: string;
  ready: boolean;
  restartCount: number;
  state: string;
}

export interface Namespace {
  name: string;
  status: string;
}

export interface Node {
  name: string;
  status: string;
  roles: string[];
  version: string;
  internalIP: string;
  os: string;
  architecture: string;
  cpuCapacity: number;
  memoryCapacity: number;
  cpuUsage: number;
  memoryUsage: number;
  cpuPercent: number;
  memoryPercent: number;
  podCount: number;
  createdAt: string;
}

export interface Context {
  name: string;
  cluster: string;
  namespace: string;
  isCurrent: boolean;
}

export interface PodEvent {
  type: 'ADDED' | 'MODIFIED' | 'DELETED';
  pod: Pod;
  timestamp: number;
}

export interface NodeMetrics {
  name: string;
  cpuUsage: number;
  memoryUsage: number;
  cpuPercent: number;
  memPercent: number;
}

export interface PodMetrics {
  name: string;
  namespace: string;
  cpuUsage: number;
  memoryUsage: number;
}

export interface MetricsSnapshot {
  timestamp: number;
  nodeMetrics: NodeMetrics[];
  podMetrics: PodMetrics[];
}

export interface ClusterSummary {
  totalNodes: number;
  readyNodes: number;
  totalPods: number;
  runningPods: number;
  pendingPods: number;
  failedPods: number;
  totalCpu: number;
  usedCpu: number;
  totalMemory: number;
  usedMemory: number;
  cpuPercent: number;
  memoryPercent: number;
}

export interface WebSocketMessage {
  type: 'pod' | 'pods' | 'metrics' | 'summary';
  data: PodEvent | Pod[] | MetricsSnapshot | ClusterSummary;
}
