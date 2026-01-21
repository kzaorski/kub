package k8s

import (
	"context"
	"fmt"
	"strings"

	"github.com/krzyzao/kub/internal/models"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// GetNodes returns all nodes in the cluster
func (c *Client) GetNodes(ctx context.Context) ([]models.Node, error) {
	nodeList, err := c.Clientset.CoreV1().Nodes().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list nodes: %w", err)
	}

	nodes := make([]models.Node, 0, len(nodeList.Items))
	for _, n := range nodeList.Items {
		nodes = append(nodes, convertNode(n))
	}

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

	return models.Node{
		Name:           n.Name,
		Status:         status,
		Roles:          roles,
		Version:        n.Status.NodeInfo.KubeletVersion,
		InternalIP:     internalIP,
		OS:             n.Status.NodeInfo.OSImage,
		Architecture:   n.Status.NodeInfo.Architecture,
		CPUCapacity:    cpuCapacity,
		MemoryCapacity: memCapacity,
		CreatedAt:      n.CreationTimestamp.Time,
	}
}
