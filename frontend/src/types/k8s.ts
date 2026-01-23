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
  cpuRequest: number;
  cpuLimit: number;
  memoryRequest: number;
  memoryLimit: number;
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
  kernelVersion: string;
  containerRuntime: string;
  internalIP: string;
  os: string;
  architecture: string;
  cpuCapacity: number;
  memoryCapacity: number;
  cpuAllocatable: number;
  memoryAllocatable: number;
  podCapacity: number;
  cpuUsage: number;
  memoryUsage: number;
  cpuPercent: number;
  memoryPercent: number;
  podCount: number;
  age: string;
  createdAt: string;
  conditions: NodeCondition[];
}

export interface NodeCondition {
  type: string;
  status: string;
  reason: string;
  message: string;
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

export interface Deployment {
  name: string;
  namespace: string;
  replicas: number;
  readyReplicas: number;
  updatedReplicas: number;
  availableReplicas: number;
  strategy: string;
  selector: Record<string, string>;
  labels: Record<string, string>;
  age: string;
  createdAt: string;
  animationClass?: string;
}

export interface Service {
  name: string;
  namespace: string;
  type: string;
  clusterIP: string;
  externalIP: string;
  ports: ServicePort[];
  selector: Record<string, string>;
  age: string;
  createdAt: string;
  animationClass?: string;
}

export interface ServicePort {
  name: string;
  port: number;
  targetPort: string;
  nodePort?: number;
  protocol: string;
}

export interface ConfigMap {
  name: string;
  namespace: string;
  dataCount: number;
  keys: string[];
  age: string;
  createdAt: string;
  animationClass?: string;
}

export interface LogOptions {
  container: string;
  tailLines?: number;
  previous?: boolean;
  timestamps?: boolean;
}

export interface LogStreamMessage {
  type: 'log' | 'error' | 'end';
  data: string;
}
