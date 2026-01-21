package k8s

import (
	"context"
	"fmt"

	"github.com/krzyzao/kub/internal/models"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// GetNodeMetrics returns metrics for all nodes
func (c *Client) GetNodeMetrics(ctx context.Context) ([]models.NodeMetrics, error) {
	nodeMetrics, err := c.MetricsClient.MetricsV1beta1().NodeMetricses().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get node metrics: %w", err)
	}

	// Get node capacities for percentage calculation
	nodes, err := c.GetNodes(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get nodes: %w", err)
	}

	nodeCapacities := make(map[string]models.Node)
	for _, n := range nodes {
		nodeCapacities[n.Name] = n
	}

	metrics := make([]models.NodeMetrics, 0, len(nodeMetrics.Items))
	for _, nm := range nodeMetrics.Items {
		cpuUsage := nm.Usage.Cpu().MilliValue()
		memUsage := nm.Usage.Memory().Value()

		var cpuPercent, memPercent float64
		if node, ok := nodeCapacities[nm.Name]; ok {
			if node.CPUCapacity > 0 {
				cpuPercent = float64(cpuUsage) / float64(node.CPUCapacity) * 100
			}
			if node.MemoryCapacity > 0 {
				memPercent = float64(memUsage) / float64(node.MemoryCapacity) * 100
			}
		}

		metrics = append(metrics, models.NodeMetrics{
			Name:        nm.Name,
			CPUUsage:    cpuUsage,
			MemoryUsage: memUsage,
			CPUPercent:  cpuPercent,
			MemPercent:  memPercent,
		})
	}

	return metrics, nil
}

// GetPodMetrics returns metrics for all pods in the given namespace
func (c *Client) GetPodMetrics(ctx context.Context, namespace string) ([]models.PodMetrics, error) {
	var podMetricsList interface{ Items() []interface{} }
	var err error

	if namespace == "" || namespace == "all" {
		pm, e := c.MetricsClient.MetricsV1beta1().PodMetricses("").List(ctx, metav1.ListOptions{})
		if e != nil {
			return nil, fmt.Errorf("failed to get pod metrics: %w", e)
		}

		metrics := make([]models.PodMetrics, 0, len(pm.Items))
		for _, p := range pm.Items {
			var cpuTotal int64
			var memTotal int64
			for _, container := range p.Containers {
				cpuTotal += container.Usage.Cpu().MilliValue()
				memTotal += container.Usage.Memory().Value()
			}
			metrics = append(metrics, models.PodMetrics{
				Name:        p.Name,
				Namespace:   p.Namespace,
				CPUUsage:    cpuTotal,
				MemoryUsage: memTotal,
			})
		}
		return metrics, nil
	}

	pm, err := c.MetricsClient.MetricsV1beta1().PodMetricses(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get pod metrics: %w", err)
	}

	_ = podMetricsList // silence unused warning

	metrics := make([]models.PodMetrics, 0, len(pm.Items))
	for _, p := range pm.Items {
		var cpuTotal int64
		var memTotal int64
		for _, container := range p.Containers {
			cpuTotal += container.Usage.Cpu().MilliValue()
			memTotal += container.Usage.Memory().Value()
		}
		metrics = append(metrics, models.PodMetrics{
			Name:        p.Name,
			Namespace:   p.Namespace,
			CPUUsage:    cpuTotal,
			MemoryUsage: memTotal,
		})
	}

	return metrics, nil
}

// GetClusterSummary returns a summary of the cluster state
func (c *Client) GetClusterSummary(ctx context.Context) (*models.ClusterSummary, error) {
	// Get nodes
	nodes, err := c.GetNodes(ctx)
	if err != nil {
		return nil, err
	}

	// Get pods
	pods, err := c.GetPods(ctx, "")
	if err != nil {
		return nil, err
	}

	// Count node status
	readyNodes := 0
	var totalCPU, totalMemory int64
	for _, n := range nodes {
		if n.Status == "Ready" {
			readyNodes++
		}
		totalCPU += n.CPUCapacity
		totalMemory += n.MemoryCapacity
	}

	// Count pod status
	runningPods := 0
	pendingPods := 0
	failedPods := 0
	for _, p := range pods {
		switch p.Status {
		case "Running":
			runningPods++
		case "Pending":
			pendingPods++
		case "Failed":
			failedPods++
		}
	}

	// Get metrics if available
	var usedCPU, usedMemory int64
	nodeMetrics, err := c.GetNodeMetrics(ctx)
	if err == nil {
		for _, m := range nodeMetrics {
			usedCPU += m.CPUUsage
			usedMemory += m.MemoryUsage
		}
	}

	var cpuPercent, memPercent float64
	if totalCPU > 0 {
		cpuPercent = float64(usedCPU) / float64(totalCPU) * 100
	}
	if totalMemory > 0 {
		memPercent = float64(usedMemory) / float64(totalMemory) * 100
	}

	return &models.ClusterSummary{
		TotalNodes:    len(nodes),
		ReadyNodes:    readyNodes,
		TotalPods:     len(pods),
		RunningPods:   runningPods,
		PendingPods:   pendingPods,
		FailedPods:    failedPods,
		TotalCPU:      totalCPU,
		UsedCPU:       usedCPU,
		TotalMemory:   totalMemory,
		UsedMemory:    usedMemory,
		CPUPercent:    cpuPercent,
		MemoryPercent: memPercent,
	}, nil
}
