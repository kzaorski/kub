package k8s

import (
	"context"
	"fmt"
	"time"

	"github.com/krzyzao/kub/internal/models"
	appsv1 "k8s.io/api/apps/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// GetDeployments returns all deployments in the given namespace
func (c *Client) GetDeployments(ctx context.Context, namespace string) ([]models.Deployment, error) {
	listOpts := metav1.ListOptions{}

	var deploymentList *appsv1.DeploymentList
	var err error

	if namespace == "" || namespace == "all" {
		deploymentList, err = c.Clientset.AppsV1().Deployments("").List(ctx, listOpts)
	} else {
		deploymentList, err = c.Clientset.AppsV1().Deployments(namespace).List(ctx, listOpts)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to list deployments: %w", err)
	}

	deployments := make([]models.Deployment, 0, len(deploymentList.Items))
	for _, d := range deploymentList.Items {
		deployments = append(deployments, convertDeployment(d))
	}

	return deployments, nil
}

// GetDeployment returns a specific deployment
func (c *Client) GetDeployment(ctx context.Context, namespace, name string) (*models.Deployment, error) {
	deployment, err := c.Clientset.AppsV1().Deployments(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get deployment: %w", err)
	}

	d := convertDeployment(*deployment)
	return &d, nil
}

func convertDeployment(d appsv1.Deployment) models.Deployment {
	// Get replica counts
	var replicas, readyReplicas, updatedReplicas, availableReplicas int32
	if d.Spec.Replicas != nil {
		replicas = *d.Spec.Replicas
	}
	if d.Status.ReadyReplicas > 0 {
		readyReplicas = d.Status.ReadyReplicas
	}
	if d.Status.UpdatedReplicas > 0 {
		updatedReplicas = d.Status.UpdatedReplicas
	}
	if d.Status.AvailableReplicas > 0 {
		availableReplicas = d.Status.AvailableReplicas
	}

	// Get strategy
	strategy := string(d.Spec.Strategy.Type)
	if strategy == "" {
		strategy = "RollingUpdate"
	}

	// Calculate age
	age := formatDuration(time.Since(d.CreationTimestamp.Time))

	return models.Deployment{
		Name:              d.Name,
		Namespace:         d.Namespace,
		Replicas:          replicas,
		ReadyReplicas:     readyReplicas,
		UpdatedReplicas:   updatedReplicas,
		AvailableReplicas: availableReplicas,
		Strategy:          strategy,
		Selector:          d.Spec.Selector.MatchLabels,
		Labels:            d.Labels,
		Age:               age,
		CreatedAt:         d.CreationTimestamp.Time,
	}
}
