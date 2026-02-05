package k8s

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/krzyzao/kub/internal/models"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// GetNodes returns all nodes in the cluster
func (c *Client) GetNodes(ctx context.Context) ([]models.Node, error) {
	ctx, span := c.tracer.Start(ctx, "k8s.nodes.list",
		trace.WithAttributes(
			attribute.String("k8s.operation", "list"),
		),
	)
	defer span.End()

	start := time.Now()
	nodeList, err := c.Clientset.CoreV1().Nodes().List(ctx, metav1.ListOptions{})
	duration := time.Since(start)

	if err != nil {
		span.RecordError(err)
		c.recordError("nodes.list", "nodes", err)
		return nil, fmt.Errorf("failed to list nodes: %w", err)
	}

	nodes := make([]models.Node, 0, len(nodeList.Items))
	for _, n := range nodeList.Items {
		nodes = append(nodes, convertNode(n))
	}

	span.SetAttributes(attribute.Int("k8s.resource_count", len(nodes)))
	c.recordOperation("nodes.list", "nodes", duration,
		attribute.Int("k8s.resource_count", len(nodes)))

	return nodes, nil
}

func convertNode(n corev1.Node) models.Node {
	// Get node status
	status := "Unknown"
	for _, cond := range n.Status.Conditions {
		if cond.Type == corev1.NodeReady {
			if cond.Status == corev1.ConditionTrue {
				status = "Ready"
			} else {
				status = "NotReady"
			}
			break
		}
	}

	// Get roles
	var roles []string
	for label := range n.Labels {
		if strings.HasPrefix(label, "node-role.kubernetes.io/") {
			role := strings.TrimPrefix(label, "node-role.kubernetes.io/")
			roles = append(roles, role)
		}
	}
	if len(roles) == 0 {
		roles = []string{"worker"}
	}

	// Get internal IP
	var internalIP string
	for _, addr := range n.Status.Addresses {
		if addr.Type == corev1.NodeInternalIP {
			internalIP = addr.Address
			break
		}
	}

	// Get capacity
	cpuCapacity := n.Status.Capacity.Cpu().MilliValue()
	memCapacity := n.Status.Capacity.Memory().Value()
	podCapacity := n.Status.Capacity.Pods().Value()

	// Get allocatable
	cpuAllocatable := n.Status.Allocatable.Cpu().MilliValue()
	memAllocatable := n.Status.Allocatable.Memory().Value()

	// Get conditions
	conditions := make([]models.NodeCondition, 0, len(n.Status.Conditions))
	for _, cond := range n.Status.Conditions {
		conditions = append(conditions, models.NodeCondition{
			Type:    string(cond.Type),
			Status:  string(cond.Status),
			Reason:  cond.Reason,
			Message: cond.Message,
		})
	}

	// Convert addresses
	addresses := make([]models.NodeAddress, 0, len(n.Status.Addresses))
	for _, addr := range n.Status.Addresses {
		addresses = append(addresses, models.NodeAddress{
			Type:    string(addr.Type),
			Address: addr.Address,
		})
	}

	// Convert taints
	taints := make([]models.Taint, 0, len(n.Spec.Taints))
	for _, t := range n.Spec.Taints {
		taints = append(taints, models.Taint{
			Key:    t.Key,
			Value:  t.Value,
			Effect: string(t.Effect),
		})
	}

	// Get first 10 container images for brevity
	images := make([]string, 0)
	for _, img := range n.Status.Images {
		if len(img.Names) > 0 {
			// Prefer the name without sha256 digest
			imageName := img.Names[len(img.Names)-1]
			for _, name := range img.Names {
				if !strings.Contains(name, "@sha256:") {
					imageName = name
					break
				}
			}
			images = append(images, imageName)
		}
		if len(images) >= 10 {
			break
		}
	}

	// Calculate age
	age := formatDuration(time.Since(n.CreationTimestamp.Time))

	return models.Node{
		Name:              n.Name,
		Status:            status,
		Roles:             roles,
		Version:           n.Status.NodeInfo.KubeletVersion,
		KernelVersion:     n.Status.NodeInfo.KernelVersion,
		ContainerRuntime:  n.Status.NodeInfo.ContainerRuntimeVersion,
		InternalIP:        internalIP,
		OS:                n.Status.NodeInfo.OSImage,
		Architecture:      n.Status.NodeInfo.Architecture,
		CPUCapacity:       cpuCapacity,
		MemoryCapacity:    memCapacity,
		CPUAllocatable:    cpuAllocatable,
		MemoryAllocatable: memAllocatable,
		PodCapacity:       podCapacity,
		Age:               age,
		CreatedAt:         n.CreationTimestamp.Time,
		Conditions:        conditions,
		Labels:            n.Labels,
		Annotations:       n.Annotations,
		Taints:            taints,
		Addresses:         addresses,
		Images:            images,
		PodCIDR:           n.Spec.PodCIDR,
	}
}
