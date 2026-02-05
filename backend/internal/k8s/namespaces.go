package k8s

import (
	"context"
	"fmt"
	"time"

	"github.com/krzyzao/kub/internal/models"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// GetNamespaces returns all namespaces in the cluster
func (c *Client) GetNamespaces(ctx context.Context) ([]models.Namespace, error) {
	ctx, span := c.tracer.Start(ctx, "k8s.namespaces.list",
		trace.WithAttributes(
			attribute.String("k8s.operation", "list"),
		),
	)
	defer span.End()

	start := time.Now()
	nsList, err := c.Clientset.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
	duration := time.Since(start)

	if err != nil {
		span.RecordError(err)
		c.recordError("namespaces.list", "namespaces", err)
		return nil, fmt.Errorf("failed to list namespaces: %w", err)
	}

	namespaces := make([]models.Namespace, 0, len(nsList.Items))
	for _, ns := range nsList.Items {
		namespaces = append(namespaces, models.Namespace{
			Name:   ns.Name,
			Status: string(ns.Status.Phase),
		})
	}

	span.SetAttributes(attribute.Int("k8s.resource_count", len(namespaces)))
	c.recordOperation("namespaces.list", "namespaces", duration,
		attribute.Int("k8s.resource_count", len(namespaces)))

	return namespaces, nil
}
