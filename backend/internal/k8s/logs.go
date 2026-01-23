package k8s

import (
	"context"
	"fmt"
	"io"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// LogOptions represents options for fetching logs
type LogOptions struct {
	Container  string
	TailLines  int64
	Previous   bool
	Timestamps bool
}

// GetPodLogs returns logs for a pod/container
func (c *Client) GetPodLogs(ctx context.Context, namespace, podName string, opts LogOptions) ([]byte, error) {
	pod, err := c.Clientset.CoreV1().Pods(namespace).Get(ctx, podName, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get pod: %w", err)
	}

	// If no container specified, use the first one
	container := opts.Container
	if container == "" {
		if len(pod.Spec.Containers) > 0 {
			container = pod.Spec.Containers[0].Name
		} else {
			return nil, fmt.Errorf("no containers found in pod")
		}
	}

	// Validate container exists
	containerExists := false
	for _, c := range pod.Spec.Containers {
		if c.Name == container {
			containerExists = true
			break
		}
	}
	if !containerExists {
		return nil, fmt.Errorf("container %s not found", container)
	}

	// If using previous logs, check init containers too
	if opts.Previous && containerExists {
		for _, c := range pod.Spec.InitContainers {
			if c.Name == container {
				containerExists = true
				break
			}
		}
	}

	logOpts := corev1.PodLogOptions{
		Container:  container,
		TailLines:  &opts.TailLines,
		Previous:   opts.Previous,
		Timestamps: opts.Timestamps,
	}

	// If TailLines is 0 or negative, don't set it (get all logs)
	if opts.TailLines <= 0 {
		logOpts.TailLines = nil
	}

	req := c.Clientset.CoreV1().Pods(namespace).GetLogs(podName, &logOpts)
	logs, err := req.DoRaw(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get logs: %w", err)
	}

	return logs, nil
}

// GetPodLogsStream returns a stream for logs (for WebSocket)
func (c *Client) GetPodLogsStream(ctx context.Context, namespace, podName string, opts LogOptions) (io.ReadCloser, error) {
	pod, err := c.Clientset.CoreV1().Pods(namespace).Get(ctx, podName, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get pod: %w", err)
	}

	// If no container specified, use the first one
	container := opts.Container
	if container == "" {
		if len(pod.Spec.Containers) > 0 {
			container = pod.Spec.Containers[0].Name
		} else {
			return nil, fmt.Errorf("no containers found in pod")
		}
	}

	// Validate container exists
	containerExists := false
	for _, c := range pod.Spec.Containers {
		if c.Name == container {
			containerExists = true
			break
		}
	}
	if !containerExists {
		return nil, fmt.Errorf("container %s not found", container)
	}

	logOpts := corev1.PodLogOptions{
		Container:  container,
		Follow:     true, // Stream mode
		Previous:   opts.Previous,
		Timestamps: opts.Timestamps,
	}

	// If TailLines is set, include it for streaming
	if opts.TailLines > 0 {
		logOpts.TailLines = &opts.TailLines
	}

	req := c.Clientset.CoreV1().Pods(namespace).GetLogs(podName, &logOpts)
	stream, err := req.Stream(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get log stream: %w", err)
	}

	return stream, nil
}

// GetContainerNames returns list of container names for a pod
func (c *Client) GetContainerNames(ctx context.Context, namespace, podName string) ([]string, error) {
	pod, err := c.Clientset.CoreV1().Pods(namespace).Get(ctx, podName, metav1.GetOptions{})
	if err != nil {
		if errors.IsNotFound(err) {
			return nil, fmt.Errorf("pod not found: %s", podName)
		}
		return nil, fmt.Errorf("failed to get pod: %w", err)
	}

	containers := make([]string, 0, len(pod.Spec.Containers)+len(pod.Spec.InitContainers))

	// Add init containers first
	for _, c := range pod.Spec.InitContainers {
		containers = append(containers, c.Name)
	}

	// Add regular containers
	for _, c := range pod.Spec.Containers {
		containers = append(containers, c.Name)
	}

	// Add ephemeral containers if any
	for _, c := range pod.Spec.EphemeralContainers {
		containers = append(containers, c.Name)
	}

	return containers, nil
}
