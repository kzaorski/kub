package models

import "time"

// Pod represents a Kubernetes pod with relevant information
type Pod struct {
	Name              string            `json:"name"`
	Namespace         string            `json:"namespace"`
	Status            string            `json:"status"`
	Phase             string            `json:"phase"`
	Ready             string            `json:"ready"`
	Restarts          int32             `json:"restarts"`
	Age               string            `json:"age"`
	IP                string            `json:"ip"`
	Node              string            `json:"node"`
	Labels            map[string]string `json:"labels"`
	Annotations       map[string]string `json:"annotations,omitempty"`
	CreatedAt         time.Time         `json:"createdAt"`
	Containers        []Container       `json:"containers"`
	CPUUsage          int64             `json:"cpuUsage"`          // millicores
	MemoryUsage       int64             `json:"memoryUsage"`       // bytes
	CPURequest        int64             `json:"cpuRequest"`        // millicores
	CPULimit          int64             `json:"cpuLimit"`          // millicores
	MemoryRequest     int64             `json:"memoryRequest"`     // bytes
	MemoryLimit       int64             `json:"memoryLimit"`       // bytes
	// Extended fields for describe
	Conditions      []PodCondition   `json:"conditions,omitempty"`
	Volumes         []Volume         `json:"volumes,omitempty"`
	OwnerReferences []OwnerReference `json:"ownerReferences,omitempty"`
	Tolerations     []Toleration     `json:"tolerations,omitempty"`
	NodeSelector    map[string]string `json:"nodeSelector,omitempty"`
	ServiceAccount  string            `json:"serviceAccount,omitempty"`
	QOSClass        string            `json:"qosClass,omitempty"`
	PriorityClass   string            `json:"priorityClass,omitempty"`
}

// PodCondition represents a condition of a pod
type PodCondition struct {
	Type               string    `json:"type"`
	Status             string    `json:"status"`
	LastTransitionTime time.Time `json:"lastTransitionTime"`
	Reason             string    `json:"reason,omitempty"`
	Message            string    `json:"message,omitempty"`
}

// Volume represents a pod volume
type Volume struct {
	Name   string `json:"name"`
	Type   string `json:"type"`
	Source string `json:"source"`
}

// OwnerReference represents a reference to an owner object
type OwnerReference struct {
	Kind string `json:"kind"`
	Name string `json:"name"`
	UID  string `json:"uid"`
}

// Toleration represents a pod toleration
type Toleration struct {
	Key      string `json:"key,omitempty"`
	Operator string `json:"operator,omitempty"`
	Value    string `json:"value,omitempty"`
	Effect   string `json:"effect,omitempty"`
}

// Container represents a container within a pod
type Container struct {
	Name            string          `json:"name"`
	Image           string          `json:"image"`
	Ready           bool            `json:"ready"`
	RestartCount    int32           `json:"restartCount"`
	State           string          `json:"state"`
	StateDetails    string          `json:"stateDetails,omitempty"`
	StartedAt       *time.Time      `json:"startedAt,omitempty"`
	VolumeMounts    []VolumeMount   `json:"volumeMounts,omitempty"`
	Env             []EnvVar        `json:"env,omitempty"`
	Ports           []ContainerPort `json:"ports,omitempty"`
	Resources       ResourceRequirements `json:"resources,omitempty"`
	SecurityContext *SecurityContext     `json:"securityContext,omitempty"`
	Command         []string        `json:"command,omitempty"`
	Args            []string        `json:"args,omitempty"`
}

// VolumeMount represents a volume mount in a container
type VolumeMount struct {
	Name      string `json:"name"`
	MountPath string `json:"mountPath"`
	ReadOnly  bool   `json:"readOnly"`
	SubPath   string `json:"subPath,omitempty"`
}

// EnvVar represents an environment variable
type EnvVar struct {
	Name      string `json:"name"`
	Value     string `json:"value,omitempty"`
	ValueFrom string `json:"valueFrom,omitempty"`
}

// ContainerPort represents a container port
type ContainerPort struct {
	Name          string `json:"name,omitempty"`
	ContainerPort int32  `json:"containerPort"`
	Protocol      string `json:"protocol"`
}

// ResourceRequirements represents container resource requirements
type ResourceRequirements struct {
	RequestsCPU    string `json:"requestsCpu,omitempty"`
	RequestsMemory string `json:"requestsMemory,omitempty"`
	LimitsCPU      string `json:"limitsCpu,omitempty"`
	LimitsMemory   string `json:"limitsMemory,omitempty"`
}

// SecurityContext represents container security context
type SecurityContext struct {
	RunAsUser    *int64 `json:"runAsUser,omitempty"`
	RunAsNonRoot *bool  `json:"runAsNonRoot,omitempty"`
	ReadOnlyFS   *bool  `json:"readOnlyRootFilesystem,omitempty"`
	Privileged   *bool  `json:"privileged,omitempty"`
}

// Namespace represents a Kubernetes namespace
type Namespace struct {
	Name   string `json:"name"`
	Status string `json:"status"`
}

// Node represents a Kubernetes node
type Node struct {
	Name               string            `json:"name"`
	Status             string            `json:"status"`
	Roles              []string          `json:"roles"`
	Version            string            `json:"version"`
	KernelVersion      string            `json:"kernelVersion"`
	ContainerRuntime   string            `json:"containerRuntime"`
	InternalIP         string            `json:"internalIP"`
	OS                 string            `json:"os"`
	Architecture       string            `json:"architecture"`
	CPUCapacity        int64             `json:"cpuCapacity"`        // millicores
	MemoryCapacity     int64             `json:"memoryCapacity"`     // bytes
	CPUAllocatable     int64             `json:"cpuAllocatable"`     // millicores
	MemoryAllocatable  int64             `json:"memoryAllocatable"`  // bytes
	PodCapacity        int64             `json:"podCapacity"`
	CPUUsage           int64             `json:"cpuUsage"`           // millicores
	MemoryUsage        int64             `json:"memoryUsage"`        // bytes
	CPUPercent         float64           `json:"cpuPercent"`
	MemoryPercent      float64           `json:"memoryPercent"`
	PodCount           int               `json:"podCount"`
	Age                string            `json:"age"`
	CreatedAt          time.Time         `json:"createdAt"`
	Conditions         []NodeCondition   `json:"conditions"`
	// Extended fields for describe
	Labels             map[string]string `json:"labels,omitempty"`
	Annotations        map[string]string `json:"annotations,omitempty"`
	Taints             []Taint           `json:"taints,omitempty"`
	Addresses          []NodeAddress     `json:"addresses,omitempty"`
	Images             []string          `json:"images,omitempty"`
	PodCIDR            string            `json:"podCIDR,omitempty"`
}

// Taint represents a node taint
type Taint struct {
	Key    string `json:"key"`
	Value  string `json:"value,omitempty"`
	Effect string `json:"effect"`
}

// NodeAddress represents a node address
type NodeAddress struct {
	Type    string `json:"type"`
	Address string `json:"address"`
}

// NodeCondition represents a node condition
type NodeCondition struct {
	Type    string `json:"type"`
	Status  string `json:"status"`
	Reason  string `json:"reason"`
	Message string `json:"message"`
}

// Context represents a Kubernetes context
type Context struct {
	Name      string `json:"name"`
	Cluster   string `json:"cluster"`
	Namespace string `json:"namespace"`
	IsCurrent bool   `json:"isCurrent"`
}

// PodEvent represents a real-time pod event
type PodEvent struct {
	Type      string `json:"type"` // ADDED, MODIFIED, DELETED
	Pod       Pod    `json:"pod"`
	Timestamp int64  `json:"timestamp"`
}

// MetricsSnapshot represents a point-in-time metrics snapshot
type MetricsSnapshot struct {
	Timestamp     int64         `json:"timestamp"`
	NodeMetrics   []NodeMetrics `json:"nodeMetrics"`
	PodMetrics    []PodMetrics  `json:"podMetrics"`
}

// NodeMetrics represents metrics for a single node
type NodeMetrics struct {
	Name        string  `json:"name"`
	CPUUsage    int64   `json:"cpuUsage"`    // millicores
	MemoryUsage int64   `json:"memoryUsage"` // bytes
	CPUPercent  float64 `json:"cpuPercent"`
	MemPercent  float64 `json:"memPercent"`
}

// PodMetrics represents metrics for a single pod
type PodMetrics struct {
	Name        string `json:"name"`
	Namespace   string `json:"namespace"`
	CPUUsage    int64  `json:"cpuUsage"`    // millicores
	MemoryUsage int64  `json:"memoryUsage"` // bytes
}

// ClusterSummary represents an overview of the cluster
type ClusterSummary struct {
	TotalNodes      int     `json:"totalNodes"`
	ReadyNodes      int     `json:"readyNodes"`
	TotalPods       int     `json:"totalPods"`
	RunningPods     int     `json:"runningPods"`
	PendingPods     int     `json:"pendingPods"`
	FailedPods      int     `json:"failedPods"`
	TotalCPU        int64   `json:"totalCpu"`        // millicores
	UsedCPU         int64   `json:"usedCpu"`         // millicores
	TotalMemory     int64   `json:"totalMemory"`     // bytes
	UsedMemory      int64   `json:"usedMemory"`      // bytes
	CPUPercent      float64 `json:"cpuPercent"`
	MemoryPercent   float64 `json:"memoryPercent"`
}

// Deployment represents a Kubernetes deployment
type Deployment struct {
	Name              string            `json:"name"`
	Namespace         string            `json:"namespace"`
	Replicas          int32             `json:"replicas"`
	ReadyReplicas     int32             `json:"readyReplicas"`
	UpdatedReplicas   int32             `json:"updatedReplicas"`
	AvailableReplicas int32             `json:"availableReplicas"`
	Strategy          string            `json:"strategy"`
	Selector          map[string]string `json:"selector"`
	Labels            map[string]string `json:"labels"`
	Age               string            `json:"age"`
	CreatedAt         time.Time         `json:"createdAt"`
	// Extended fields for describe
	Annotations       map[string]string      `json:"annotations,omitempty"`
	Conditions        []DeploymentCondition  `json:"conditions,omitempty"`
	MaxSurge          string                 `json:"maxSurge,omitempty"`
	MaxUnavailable    string                 `json:"maxUnavailable,omitempty"`
	PodTemplateImage  string                 `json:"podTemplateImage,omitempty"`
	RevisionHistory   int32                  `json:"revisionHistoryLimit,omitempty"`
}

// DeploymentCondition represents a deployment condition
type DeploymentCondition struct {
	Type               string    `json:"type"`
	Status             string    `json:"status"`
	LastTransitionTime time.Time `json:"lastTransitionTime"`
	Reason             string    `json:"reason,omitempty"`
	Message            string    `json:"message,omitempty"`
}

// Service represents a Kubernetes service
type Service struct {
	Name            string            `json:"name"`
	Namespace       string            `json:"namespace"`
	Type            string            `json:"type"`
	ClusterIP       string            `json:"clusterIP"`
	ExternalIP      string            `json:"externalIP"`
	Ports           []ServicePort     `json:"ports"`
	Selector        map[string]string `json:"selector"`
	Age             string            `json:"age"`
	CreatedAt       time.Time         `json:"createdAt"`
	// Extended fields for describe
	Labels          map[string]string `json:"labels,omitempty"`
	Annotations     map[string]string `json:"annotations,omitempty"`
	SessionAffinity string            `json:"sessionAffinity,omitempty"`
	ExternalName    string            `json:"externalName,omitempty"`
	LoadBalancerIP  string            `json:"loadBalancerIP,omitempty"`
}

// ServicePort represents a service port
type ServicePort struct {
	Name       string `json:"name"`
	Port       int32  `json:"port"`
	TargetPort string `json:"targetPort"`
	NodePort   int32  `json:"nodePort,omitempty"`
	Protocol   string `json:"protocol"`
}

// ConfigMap represents a Kubernetes configmap
type ConfigMap struct {
	Name        string            `json:"name"`
	Namespace   string            `json:"namespace"`
	DataCount   int               `json:"dataCount"`
	Keys        []string          `json:"keys"`
	Age         string            `json:"age"`
	CreatedAt   time.Time         `json:"createdAt"`
	// Extended fields for describe
	Data        map[string]string `json:"data,omitempty"`
	BinaryData  map[string]string `json:"binaryData,omitempty"`
	Labels      map[string]string `json:"labels,omitempty"`
	Annotations map[string]string `json:"annotations,omitempty"`
}

// LogOptions represents options for fetching logs
type LogOptions struct {
	Container  string `json:"container"`
	TailLines  int64  `json:"tailLines"`
	Previous   bool   `json:"previous"`
	Timestamps bool   `json:"timestamps"`
}

// LogResponse represents the log response
type LogResponse struct {
	Logs      string `json:"logs"`
	Container string `json:"container"`
	Pod       string `json:"pod"`
	Namespace string `json:"namespace"`
}

// Event represents a Kubernetes event
type Event struct {
	Type      string    `json:"type"`      // Normal, Warning
	Reason    string    `json:"reason"`    // Scheduled, Pulling, Started, etc.
	Message   string    `json:"message"`
	Count     int32     `json:"count"`
	FirstSeen time.Time `json:"firstSeen"`
	LastSeen  time.Time `json:"lastSeen"`
	Source    string    `json:"source"`    // kubelet, scheduler, etc.
	Object    string    `json:"object"`    // Pod/nginx-abc123, etc.
}

// Endpoint represents a Kubernetes endpoint for a service
type Endpoint struct {
	Addresses []EndpointAddress `json:"addresses"`
	Ports     []EndpointPort    `json:"ports"`
	NotReady  []EndpointAddress `json:"notReadyAddresses,omitempty"`
}

// EndpointAddress represents an endpoint address
type EndpointAddress struct {
	IP        string `json:"ip"`
	Hostname  string `json:"hostname,omitempty"`
	NodeName  string `json:"nodeName,omitempty"`
	TargetRef string `json:"targetRef,omitempty"` // Pod/nginx-abc123
}

// EndpointPort represents an endpoint port
type EndpointPort struct {
	Name     string `json:"name,omitempty"`
	Port     int32  `json:"port"`
	Protocol string `json:"protocol"`
}
