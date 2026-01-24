package k8s

import (
	"context"
	"fmt"
	"sort"

	"github.com/krzyzao/kub/internal/models"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/watch"
)

// WatchEvents returns a watch interface for events
func (c *Client) WatchEvents(ctx context.Context, namespace string) (watch.Interface, error) {
	listOpts := metav1.ListOptions{
		Watch: true,
	}

	if namespace == "" || namespace == "all" {
		return c.Clientset.CoreV1().Events("").Watch(ctx, listOpts)
	}
	return c.Clientset.CoreV1().Events(namespace).Watch(ctx, listOpts)
}

// GetResourceEvents returns events for a specific resource
func (c *Client) GetResourceEvents(ctx context.Context, namespace, kind, name string) ([]models.Event, error) {
	// Build field selector to filter events for specific resource
	fieldSelector := fmt.Sprintf("involvedObject.name=%s,involvedObject.kind=%s", name, kind)

	listOpts := metav1.ListOptions{
		FieldSelector: fieldSelector,
	}

	eventList, err := c.Clientset.CoreV1().Events(namespace).List(ctx, listOpts)
	if err != nil {
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
