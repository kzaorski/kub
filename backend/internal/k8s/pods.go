package k8s

import (
	"context"
	"fmt"
	"time"

	"github.com/krzyzao/kub/internal/models"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/watch"
)

// GetPods returns all pods in the given namespace
func (c *Client) GetPods(ctx context.Context, namespace string) ([]models.Pod, error) {
	listOpts := metav1.ListOptions{}

	var podList *corev1.PodList
	var err error

	if namespace == "" || namespace == "all" {
		podList, err = c.Clientset.CoreV1().Pods("").List(ctx, listOpts)
	} else {
		podList, err = c.Clientset.CoreV1().Pods(namespace).List(ctx, listOpts)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to list pods: %w", err)
	}

	pods := make([]models.Pod, 0, len(podList.Items))
	for _, p := range podList.Items {
		pods = append(pods, convertPod(p))
	}

	return pods, nil
}

// GetPod returns a specific pod
func (c *Client) GetPod(ctx context.Context, namespace, name string) (*models.Pod, error) {
	pod, err := c.Clientset.CoreV1().Pods(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get pod: %w", err)
	}

	p := convertPod(*pod)
	return &p, nil
}

// WatchPods returns a watch interface for pods in the given namespace
func (c *Client) WatchPods(ctx context.Context, namespace string) (watch.Interface, error) {
	listOpts := metav1.ListOptions{
		Watch: true,
	}

	if namespace == "" || namespace == "all" {
		return c.Clientset.CoreV1().Pods("").Watch(ctx, listOpts)
	}
	return c.Clientset.CoreV1().Pods(namespace).Watch(ctx, listOpts)
}

func convertPod(p corev1.Pod) models.Pod {
	containers := make([]models.Container, 0, len(p.Spec.Containers))

	for _, c := range p.Spec.Containers {
		container := models.Container{
			Name:  c.Name,
			Image: c.Image,
		}

		// Find container status
		for _, cs := range p.Status.ContainerStatuses {
			if cs.Name == c.Name {
				container.Ready = cs.Ready
				container.RestartCount = cs.RestartCount
				container.State = getContainerState(cs.State)
				break
			}
		}

		containers = append(containers, container)
	}

	// Calculate ready containers
	readyCount := 0
	totalCount := len(p.Status.ContainerStatuses)
	var totalRestarts int32 = 0

	for _, cs := range p.Status.ContainerStatuses {
		if cs.Ready {
			readyCount++
		}
		totalRestarts += cs.RestartCount
	}

	ready := fmt.Sprintf("%d/%d", readyCount, totalCount)

	// Calculate age
	age := formatDuration(time.Since(p.CreationTimestamp.Time))

	// Get pod IP
	ip := p.Status.PodIP
	if ip == "" {
		ip = "-"
	}

	status := getPodStatus(p)

	return models.Pod{
		Name:       p.Name,
		Namespace:  p.Namespace,
		Status:     status,
		Phase:      string(p.Status.Phase),
		Ready:      ready,
		Restarts:   totalRestarts,
		Age:        age,
		IP:         ip,
		Node:       p.Spec.NodeName,
		Labels:     p.Labels,
		CreatedAt:  p.CreationTimestamp.Time,
		Containers: containers,
	}
}

func getPodStatus(pod corev1.Pod) string {
	// Check for deletion
	if pod.DeletionTimestamp != nil {
		return "Terminating"
	}

	// Check init containers - only report if waiting or failed
	for _, cs := range pod.Status.InitContainerStatuses {
		if cs.State.Waiting != nil && cs.State.Waiting.Reason != "" {
			return "Init:" + cs.State.Waiting.Reason
		}
		// Only report terminated init containers if they failed (non-zero exit code)
		if cs.State.Terminated != nil && cs.State.Terminated.ExitCode != 0 {
			reason := cs.State.Terminated.Reason
			if reason == "" {
				reason = "Error"
			}
			return "Init:" + reason
		}
	}

	// Check container statuses
	for _, cs := range pod.Status.ContainerStatuses {
		if cs.State.Waiting != nil && cs.State.Waiting.Reason != "" {
			return cs.State.Waiting.Reason
		}
		if cs.State.Terminated != nil && cs.State.Terminated.Reason != "" {
			return cs.State.Terminated.Reason
		}
	}

	// Check conditions
	for _, cond := range pod.Status.Conditions {
		if cond.Type == corev1.PodReady && cond.Status == corev1.ConditionTrue {
			return "Running"
		}
	}

	return string(pod.Status.Phase)
}

func getContainerState(state corev1.ContainerState) string {
	if state.Running != nil {
		return "Running"
	}
	if state.Waiting != nil {
		if state.Waiting.Reason != "" {
			return state.Waiting.Reason
		}
		return "Waiting"
	}
	if state.Terminated != nil {
		if state.Terminated.Reason != "" {
			return state.Terminated.Reason
		}
		return "Terminated"
	}
	return "Unknown"
}

func formatDuration(d time.Duration) string {
	if d < time.Minute {
		return fmt.Sprintf("%ds", int(d.Seconds()))
	}
	if d < time.Hour {
		return fmt.Sprintf("%dm", int(d.Minutes()))
	}
	if d < 24*time.Hour {
		return fmt.Sprintf("%dh", int(d.Hours()))
	}
	days := int(d.Hours() / 24)
	return fmt.Sprintf("%dd", days)
}
