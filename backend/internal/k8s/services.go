package k8s

import (
	"context"
	"fmt"
	"time"

	"github.com/krzyzao/kub/internal/models"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// GetServices returns all services in the given namespace
func (c *Client) GetServices(ctx context.Context, namespace string) ([]models.Service, error) {
	listOpts := metav1.ListOptions{}

	var serviceList *corev1.ServiceList
	var err error

	if namespace == "" || namespace == "all" {
		serviceList, err = c.Clientset.CoreV1().Services("").List(ctx, listOpts)
	} else {
		serviceList, err = c.Clientset.CoreV1().Services(namespace).List(ctx, listOpts)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to list services: %w", err)
	}

	services := make([]models.Service, 0, len(serviceList.Items))
	for _, s := range serviceList.Items {
		services = append(services, convertService(s))
	}

	return services, nil
}

// GetService returns a specific service
func (c *Client) GetService(ctx context.Context, namespace, name string) (*models.Service, error) {
	service, err := c.Clientset.CoreV1().Services(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get service: %w", err)
	}

	s := convertService(*service)
	return &s, nil
}

func convertService(s corev1.Service) models.Service {
	// Get service type
	serviceType := string(s.Spec.Type)

	// Get cluster IP
	clusterIP := s.Spec.ClusterIP
	if clusterIP == "" {
		clusterIP = "-"
	}

	// Get external IP
	var externalIP string
	if len(s.Spec.ExternalIPs) > 0 {
		externalIP = s.Spec.ExternalIPs[0]
	} else if s.Status.LoadBalancer.Ingress != nil && len(s.Status.LoadBalancer.Ingress) > 0 {
		if s.Status.LoadBalancer.Ingress[0].IP != "" {
			externalIP = s.Status.LoadBalancer.Ingress[0].IP
		} else if s.Status.LoadBalancer.Ingress[0].Hostname != "" {
			externalIP = s.Status.LoadBalancer.Ingress[0].Hostname
		}
	}
	if externalIP == "" {
		externalIP = "-"
	}

	// Convert ports
	ports := make([]models.ServicePort, 0, len(s.Spec.Ports))
	for _, p := range s.Spec.Ports {
		port := models.ServicePort{
			Name:       p.Name,
			Port:       p.Port,
			TargetPort: p.TargetPort.String(),
			Protocol:   string(p.Protocol),
		}
		if p.NodePort != 0 {
			port.NodePort = p.NodePort
		}
		ports = append(ports, port)
	}

	// Get session affinity
	sessionAffinity := string(s.Spec.SessionAffinity)

	// Get external name (for ExternalName services)
	externalName := s.Spec.ExternalName

	// Get load balancer IP
	loadBalancerIP := s.Spec.LoadBalancerIP

	// Calculate age
	age := formatDuration(time.Since(s.CreationTimestamp.Time))

	return models.Service{
		Name:            s.Name,
		Namespace:       s.Namespace,
		Type:            serviceType,
		ClusterIP:       clusterIP,
		ExternalIP:      externalIP,
		Ports:           ports,
		Selector:        s.Spec.Selector,
		Age:             age,
		CreatedAt:       s.CreationTimestamp.Time,
		Labels:          s.Labels,
		Annotations:     s.Annotations,
		SessionAffinity: sessionAffinity,
		ExternalName:    externalName,
		LoadBalancerIP:  loadBalancerIP,
	}
}
