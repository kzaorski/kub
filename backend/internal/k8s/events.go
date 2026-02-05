package k8s

import (
	"context"
	"fmt"
	"sort"
	"time"

	"github.com/krzyzao/kub/internal/models"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/watch"
)

// WatchEvents returns a watch interface for events
func (c *Client) WatchEvents(ctx context.Context, namespace string) (watch.Interface, error) {
	ctx, span := c.tracer.Start(ctx, "k8s.events.watch",
		trace.WithAttributes(
			attribute.String("k8s.namespace", namespace),
			attribute.String("k8s.operation", "watch"),
		),
	)
	defer span.End()

	start := time.Now()
	listOpts := metav1.ListOptions{
		Watch: true,
	}

	var w watch.Interface
	var err error

	if namespace == "" || namespace == "all" {
		w, err = c.Clientset.CoreV1().Events("").Watch(ctx, listOpts)
	} else {
		w, err = c.Clientset.CoreV1().Events(namespace).Watch(ctx, listOpts)
	}

	duration := time.Since(start)

	if err != nil {
		span.RecordError(err)
		span.End()
		c.recordError("events.watch", "events", err,
			attribute.String("k8s.namespace", namespace))
		return nil, err
	}

	c.recordOperation("events.watch", "events", duration,
		attribute.String("k8s.namespace", namespace))

	return w, nil
}

// GetResourceEvents returns events for a specific resource
func (c *Client) GetResourceEvents(ctx context.Context, namespace, kind, name string) ([]models.Event, error) {
	ctx, span := c.tracer.Start(ctx, "k8s.events.list",
		trace.WithAttributes(
			attribute.String("k8s.namespace", namespace),
			attribute.String("k8s.resource_kind", kind),
			attribute.String("k8s.resource_name", name),
			attribute.String("k8s.operation", "list"),
		),
	)
	defer span.End()

	start := time.Now()
	// Build field selector to filter events for specific resource
	fieldSelector := fmt.Sprintf("involvedObject.name=%s,involvedObject.kind=%s", name, kind)

	listOpts := metav1.ListOptions{
		FieldSelector: fieldSelector,
	}

	eventList, err := c.Clientset.CoreV1().Events(namespace).List(ctx, listOpts)
	duration := time.Since(start)

	if err != nil {
		span.RecordError(err)
		c.recordError("events.list", "events", err,
			attribute.String("k8s.namespace", namespace),
			attribute.String("k8s.resource_kind", kind),
			attribute.String("k8s.resource_name", name))
		return nil, fmt.Errorf("failed to list events: %w", err)
	}

	events := make([]models.Event, 0, len(eventList.Items))
	for _, e := range eventList.Items {
		events = append(events, convertEvent(e))
	}

	// Sort by LastSeen descending (most recent first)
	sort.Slice(events, func(i, j int) bool {
		return events[i].LastSeen.After(events[j].LastSeen)
	})

	span.SetAttributes(attribute.Int("k8s.resource_count", len(events)))
	c.recordOperation("events.list", "events", duration,
		attribute.String("k8s.namespace", namespace),
		attribute.String("k8s.resource_kind", kind),
		attribute.String("k8s.resource_name", name),
		attribute.Int("k8s.resource_count", len(events)))

	return events, nil
}

func convertEvent(e corev1.Event) models.Event {
	source := e.Source.Component
	if e.Source.Host != "" {
		source = fmt.Sprintf("%s/%s", source, e.Source.Host)
	}

	object := fmt.Sprintf("%s/%s", e.InvolvedObject.Kind, e.InvolvedObject.Name)

	return models.Event{
		Type:      e.Type,
		Reason:    e.Reason,
		Message:   e.Message,
		Count:     e.Count,
		FirstSeen: e.FirstTimestamp.Time,
		LastSeen:  e.LastTimestamp.Time,
		Source:    source,
		Object:    object,
		FieldPath: e.InvolvedObject.FieldPath,
	}
}
