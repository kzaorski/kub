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
  annotations?: Record<string, string>;
  createdAt: string;
  containers: Container[];
  cpuUsage: number;
  memoryUsage: number;
  cpuRequest: number;
  cpuLimit: number;
  memoryRequest: number;
  memoryLimit: number;
  // Extended fields for describe
  conditions?: PodCondition[];
  volumes?: Volume[];
  ownerReferences?: OwnerReference[];
  tolerations?: Toleration[];
  nodeSelector?: Record<string, string>;
  serviceAccount?: string;
  qosClass?: string;
  priorityClass?: string;
}

export interface PodCondition {
  type: string;
  status: string;
  lastTransitionTime: string;
  reason?: string;
  message?: string;
}

export interface Volume {
  name: string;
  type: string;
  source: string;
}

export interface OwnerReference {
  kind: string;
  name: string;
  uid: string;
}

export interface Toleration {
  key?: string;
  operator?: string;
  value?: string;
  effect?: string;
}

export interface Container {
  name: string;
  image: string;
  ready: boolean;
  restartCount: number;
  state: string;
  stateDetails?: string;
  startedAt?: string;
  volumeMounts?: VolumeMount[];
  env?: EnvVar[];
  ports?: ContainerPort[];
  resources?: ResourceRequirements;
  securityContext?: SecurityContext;
  command?: string[];
  args?: string[];
}

export interface VolumeMount {
  name: string;
  mountPath: string;
  readOnly: boolean;
  subPath?: string;
}

export interface EnvVar {
  name: string;
  value?: string;
  valueFrom?: string;
}

export interface ContainerPort {
  name?: string;
  containerPort: number;
  protocol: string;
}

export interface ResourceRequirements {
  requestsCpu?: string;
  requestsMemory?: string;
  limitsCpu?: string;
  limitsMemory?: string;
}

export interface SecurityContext {
  runAsUser?: number;
  runAsNonRoot?: boolean;
  readOnlyRootFilesystem?: boolean;
  privileged?: boolean;
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
  // Extended fields for describe
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  taints?: Taint[];
  addresses?: NodeAddress[];
  images?: string[];
  podCIDR?: string;
}

export interface NodeCondition {
  type: string;
  status: string;
  reason: string;
  message: string;
}

export interface Taint {
  key: string;
  value?: string;
  effect: string;
}

export interface NodeAddress {
  type: string;
  address: string;
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
  // Extended fields for describe
  annotations?: Record<string, string>;
  conditions?: DeploymentCondition[];
  maxSurge?: string;
  maxUnavailable?: string;
  podTemplateImage?: string;
  revisionHistoryLimit?: number;
}

export interface DeploymentCondition {
  type: string;
  status: string;
  lastTransitionTime: string;
  reason?: string;
  message?: string;
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
  // Extended fields for describe
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  sessionAffinity?: string;
  externalName?: string;
  loadBalancerIP?: string;
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
  // Extended fields for describe
  data?: Record<string, string>;
  binaryData?: Record<string, string>;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
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

// Event types for describe functionality
export interface Event {
  type: string;      // Normal, Warning
  reason: string;    // Scheduled, Pulling, Started, etc.
  message: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  source: string;    // kubelet, scheduler, etc.
  object: string;    // Pod/nginx-abc123, etc.
  fieldPath?: string; // spec.containers{name}, spec.containers[index]
}

// Endpoint types for Service describe
export interface Endpoint {
  addresses: EndpointAddress[];
  ports: EndpointPort[];
  notReadyAddresses?: EndpointAddress[];
}

export interface EndpointAddress {
  ip: string;
  hostname?: string;
  nodeName?: string;
  targetRef?: string; // Pod/nginx-abc123
}

export interface EndpointPort {
  name?: string;
  port: number;
  protocol: string;
}

// Type for resource kinds that support describe
export type DescribableResource = 'Pod' | 'Node' | 'Deployment' | 'Service' | 'ConfigMap';
