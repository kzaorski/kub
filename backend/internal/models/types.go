package models

import "time"

// Pod represents a Kubernetes pod with relevant information
type Pod struct {
	Name         string            `json:"name"`
	Namespace    string            `json:"namespace"`
	Status       string            `json:"status"`
	Phase        string            `json:"phase"`
	Ready        string            `json:"ready"`
	Restarts     int32             `json:"restarts"`
	Age          string            `json:"age"`
	IP           string            `json:"ip"`
	Node         string            `json:"node"`
	Labels       map[string]string `json:"labels"`
	CreatedAt    time.Time         `json:"createdAt"`
	Containers   []Container       `json:"containers"`
	CPUUsage     int64             `json:"cpuUsage"`     // millicores
	MemoryUsage  int64             `json:"memoryUsage"`  // bytes
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
	Name             string    `json:"name"`
	Status           string    `json:"status"`
	Roles            []string  `json:"roles"`
	Version          string    `json:"version"`
	InternalIP       string    `json:"internalIP"`
	OS               string    `json:"os"`
	Architecture     string    `json:"architecture"`
	CPUCapacity      int64     `json:"cpuCapacity"`      // millicores
	MemoryCapacity   int64     `json:"memoryCapacity"`   // bytes
	CPUUsage         int64     `json:"cpuUsage"`         // millicores
	MemoryUsage      int64     `json:"memoryUsage"`      // bytes
	CPUPercent       float64   `json:"cpuPercent"`
	MemoryPercent    float64   `json:"memoryPercent"`
	PodCount         int       `json:"podCount"`
	CreatedAt        time.Time `json:"createdAt"`
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
