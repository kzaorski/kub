package k8s

import (
	"context"
	"fmt"
	"io"
	"sync"
	"time"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"
)

type spanClosingReadCloser struct {
	io.ReadCloser
	once sync.Once
	end  func()
}

func (s *spanClosingReadCloser) Close() error {
	s.once.Do(func() {
		if s.end != nil {
			s.end()
		}
	})
	return s.ReadCloser.Close()
}

// LogOptions represents options for fetching logs
type LogOptions struct {
	Container  string
	TailLines  int64
	Previous   bool
	Timestamps bool
}

// GetPodLogs returns logs for a pod/container
func (c *Client) GetPodLogs(ctx context.Context, namespace, podName string, opts LogOptions) ([]byte, error) {
	ctx, span := c.tracer.Start(ctx, "k8s.logs.get",
		trace.WithAttributes(
			attribute.String("k8s.namespace", namespace),
			attribute.String("k8s.pod_name", podName),
			attribute.String("k8s.container", opts.Container),
			attribute.String("k8s.operation", "get"),
		),
	)
	defer span.End()

	start := time.Now()
	pod, err := c.Clientset.CoreV1().Pods(namespace).Get(ctx, podName, metav1.GetOptions{})
	if err != nil {
		span.RecordError(err)
		c.recordError("logs.get", "logs", err,
			attribute.String("k8s.namespace", namespace),
			attribute.String("k8s.pod_name", podName))
		return nil, fmt.Errorf("failed to get pod: %w", err)
	}

	// If no container specified, use the first one
	container := opts.Container
	if container == "" {
		if len(pod.Spec.Containers) > 0 {
			container = pod.Spec.Containers[0].Name
		} else {
			err := fmt.Errorf("no containers found in pod")
			span.RecordError(err)
			return nil, err
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
		err := fmt.Errorf("container %s not found", container)
		span.RecordError(err)
		c.recordError("logs.get", "logs", err,
			attribute.String("k8s.namespace", namespace),
			attribute.String("k8s.pod_name", podName),
			attribute.String("k8s.container", container))
		return nil, err
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
	duration := time.Since(start)

	if err != nil {
		span.RecordError(err)
		c.recordError("logs.get", "logs", err,
			attribute.String("k8s.namespace", namespace),
			attribute.String("k8s.pod_name", podName),
			attribute.String("k8s.container", container))
		return nil, fmt.Errorf("failed to get logs: %w", err)
	}

	c.recordOperation("logs.get", "logs", duration,
		attribute.String("k8s.namespace", namespace),
		attribute.String("k8s.pod_name", podName),
		attribute.String("k8s.container", container))

	return logs, nil
}

// GetPodLogsStream returns a stream for logs (for WebSocket)
func (c *Client) GetPodLogsStream(ctx context.Context, namespace, podName string, opts LogOptions) (io.ReadCloser, error) {
	ctx, span := c.tracer.Start(ctx, "k8s.logs.stream",
		trace.WithAttributes(
			attribute.String("k8s.namespace", namespace),
			attribute.String("k8s.pod_name", podName),
			attribute.String("k8s.container", opts.Container),
			attribute.Bool("k8s.follow", true),
			attribute.String("k8s.operation", "stream"),
		),
	)
	// Don't defer span.End() as this is a long-running stream operation

	pod, err := c.Clientset.CoreV1().Pods(namespace).Get(ctx, podName, metav1.GetOptions{})
	if err != nil {
		span.RecordError(err)
		span.End()
		c.recordError("logs.stream", "logs", err,
			attribute.String("k8s.namespace", namespace),
			attribute.String("k8s.pod_name", podName))
		return nil, fmt.Errorf("failed to get pod: %w", err)
	}

	// If no container specified, use the first one
	container := opts.Container
	if container == "" {
		if len(pod.Spec.Containers) > 0 {
			container = pod.Spec.Containers[0].Name
		} else {
			err := fmt.Errorf("no containers found in pod")
			span.RecordError(err)
			span.End()
			return nil, err
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
		err := fmt.Errorf("container %s not found", container)
		span.RecordError(err)
		span.End()
		c.recordError("logs.stream", "logs", err,
			attribute.String("k8s.namespace", namespace),
			attribute.String("k8s.pod_name", podName),
			attribute.String("k8s.container", container))
		return nil, err
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
		span.RecordError(err)
		span.End()
		c.recordError("logs.stream", "logs", err,
			attribute.String("k8s.namespace", namespace),
			attribute.String("k8s.pod_name", podName),
			attribute.String("k8s.container", container))
		return nil, fmt.Errorf("failed to get log stream: %w", err)
	}

	return &spanClosingReadCloser{ReadCloser: stream, end: span.End}, nil
}

// GetContainerNames returns list of container names for a pod
func (c *Client) GetContainerNames(ctx context.Context, namespace, podName string) ([]string, error) {
	ctx, span := c.tracer.Start(ctx, "k8s.pods.containers.list",
		trace.WithAttributes(
			attribute.String("k8s.namespace", namespace),
			attribute.String("k8s.pod_name", podName),
			attribute.String("k8s.operation", "list_containers"),
		),
	)
	defer span.End()

	pod, err := c.Clientset.CoreV1().Pods(namespace).Get(ctx, podName, metav1.GetOptions{})
	if err != nil {
		span.RecordError(err)
		if errors.IsNotFound(err) {
			c.recordError("pods.containers.list", "pods", err,
				attribute.String("k8s.namespace", namespace),
				attribute.String("k8s.pod_name", podName),
				attribute.String("k8s.error_type", "NotFound"))
			return nil, fmt.Errorf("pod not found: %s", podName)
		}
		c.recordError("pods.containers.list", "pods", err,
			attribute.String("k8s.namespace", namespace),
			attribute.String("k8s.pod_name", podName))
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

	span.SetAttributes(attribute.Int("k8s.container_count", len(containers)))

	return containers, nil
}
