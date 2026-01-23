package k8s

import (
	"context"
	"fmt"

	"github.com/krzyzao/kub/internal/models"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// GetServiceEndpoints returns endpoints for a specific service
func (c *Client) GetServiceEndpoints(ctx context.Context, namespace, serviceName string) (*models.Endpoint, error) {
	// Endpoints have the same name as the service
	endpoints, err := c.Clientset.CoreV1().Endpoints(namespace).Get(ctx, serviceName, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get endpoints: %w", err)
	}

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

	return result, nil
}
