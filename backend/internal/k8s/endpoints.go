package k8s

import (
	"context"
	"fmt"

	"github.com/krzyzao/kub/internal/models"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// GetServiceEndpoints returns endpoints for a specific service
func (c *Client) GetServiceEndpoints(ctx context.Context, namespace, serviceName string) (*models.Endpoint, error) {
	ctx, span := c.tracer.Start(ctx, "k8s.endpoints.get",
		trace.WithAttributes(
			attribute.String("k8s.namespace", namespace),
			attribute.String("k8s.service_name", serviceName),
			attribute.String("k8s.operation", "get"),
		),
	)
	defer span.End()

	// Endpoints have the same name as the service
	endpoints, err := c.Clientset.CoreV1().Endpoints(namespace).Get(ctx, serviceName, metav1.GetOptions{})
	if err != nil {
		span.RecordError(err)
		c.recordError("endpoints.get", "endpoints", err,
			attribute.String("k8s.namespace", namespace),
			attribute.String("k8s.service_name", serviceName))
		return nil, fmt.Errorf("failed to get endpoints: %w", err)
	}

	c.recordOperation("endpoints.get", "endpoints", 0,
		attribute.String("k8s.namespace", namespace),
		attribute.String("k8s.service_name", serviceName))

	result := &models.Endpoint{
		Addresses: []models.EndpointAddress{},
		Ports:     []models.EndpointPort{},
		NotReady:  []models.EndpointAddress{},
	}

	for _, subset := range endpoints.Subsets {
		// Convert ready addresses
		for _, addr := range subset.Addresses {
			address := models.EndpointAddress{
				IP:       addr.IP,
				Hostname: addr.Hostname,
			}
			if addr.NodeName != nil {
				address.NodeName = *addr.NodeName
			}
			if addr.TargetRef != nil {
				address.TargetRef = fmt.Sprintf("%s/%s", addr.TargetRef.Kind, addr.TargetRef.Name)
			}
			result.Addresses = append(result.Addresses, address)
		}

		// Convert not-ready addresses
		for _, addr := range subset.NotReadyAddresses {
			address := models.EndpointAddress{
				IP:       addr.IP,
				Hostname: addr.Hostname,
			}
			if addr.NodeName != nil {
				address.NodeName = *addr.NodeName
			}
			if addr.TargetRef != nil {
				address.TargetRef = fmt.Sprintf("%s/%s", addr.TargetRef.Kind, addr.TargetRef.Name)
			}
			result.NotReady = append(result.NotReady, address)
		}

		// Convert ports
		for _, port := range subset.Ports {
			result.Ports = append(result.Ports, models.EndpointPort{
				Name:     port.Name,
				Port:     port.Port,
				Protocol: string(port.Protocol),
			})
		}
	}

	span.SetAttributes(
		attribute.Int("k8s.address_count", len(result.Addresses)),
		attribute.Int("k8s.not_ready_count", len(result.NotReady)),
	)

	return result, nil
}
