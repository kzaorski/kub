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
	CreatedAt         time.Time         `json:"createdAt"`
	Containers        []Container       `json:"containers"`
	CPUUsage          int64             `json:"cpuUsage"`          // millicores
	MemoryUsage       int64             `json:"memoryUsage"`       // bytes
	CPURequest        int64             `json:"cpuRequest"`        // millicores
	CPULimit          int64             `json:"cpuLimit"`          // millicores
	MemoryRequest     int64             `json:"memoryRequest"`     // bytes
	MemoryLimit       int64             `json:"memoryLimit"`       // bytes
}

// Container represents a container within a pod
type Container struct {
	Name         string `json:"name"`
	Image        string `json:"image"`
	Ready        bool   `json:"ready"`
	RestartCount int32  `json:"restartCount"`
	State        string `json:"state"`
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
}

// Service represents a Kubernetes service
type Service struct {
	Name        string            `json:"name"`
	Namespace   string            `json:"namespace"`
	Type        string            `json:"type"`
	ClusterIP   string            `json:"clusterIP"`
	ExternalIP  string            `json:"externalIP"`
	Ports       []ServicePort     `json:"ports"`
	Selector    map[string]string `json:"selector"`
	Age         string            `json:"age"`
	CreatedAt   time.Time         `json:"createdAt"`
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
	Name      string            `json:"name"`
	Namespace string            `json:"namespace"`
	DataCount int               `json:"dataCount"`
	Keys      []string          `json:"keys"`
	Age       string            `json:"age"`
	CreatedAt time.Time         `json:"createdAt"`
}
