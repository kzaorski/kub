package k8s

import (
	"context"
	"fmt"
	"time"

	"github.com/krzyzao/kub/internal/models"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"
	appsv1 "k8s.io/api/apps/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// GetDeployments returns all deployments in the given namespace
func (c *Client) GetDeployments(ctx context.Context, namespace string) ([]models.Deployment, error) {
	ctx, span := c.tracer.Start(ctx, "k8s.deployments.list",
		trace.WithAttributes(
			attribute.String("k8s.namespace", namespace),
			attribute.String("k8s.operation", "list"),
		),
	)
	defer span.End()

	start := time.Now()
	listOpts := metav1.ListOptions{}

	var deploymentList *appsv1.DeploymentList
	var err error

	if namespace == "" || namespace == "all" {
		deploymentList, err = c.Clientset.AppsV1().Deployments("").List(ctx, listOpts)
	} else {
		deploymentList, err = c.Clientset.AppsV1().Deployments(namespace).List(ctx, listOpts)
	}

	duration := time.Since(start)

	if err != nil {
		span.RecordError(err)
		c.recordError("deployments.list", "deployments", err,
			attribute.String("k8s.namespace", namespace))
		return nil, fmt.Errorf("failed to list deployments: %w", err)
	}

	deployments := make([]models.Deployment, 0, len(deploymentList.Items))
	for _, d := range deploymentList.Items {
		deployments = append(deployments, convertDeployment(d))
	}

	span.SetAttributes(attribute.Int("k8s.resource_count", len(deployments)))
	c.recordOperation("deployments.list", "deployments", duration,
		attribute.String("k8s.namespace", namespace),
		attribute.Int("k8s.resource_count", len(deployments)))

	return deployments, nil
}

// GetDeployment returns a specific deployment
func (c *Client) GetDeployment(ctx context.Context, namespace, name string) (*models.Deployment, error) {
	ctx, span := c.tracer.Start(ctx, "k8s.deployments.get",
		trace.WithAttributes(
			attribute.String("k8s.namespace", namespace),
			attribute.String("k8s.deployment_name", name),
			attribute.String("k8s.operation", "get"),
		),
	)
	defer span.End()

	start := time.Now()
	deployment, err := c.Clientset.AppsV1().Deployments(namespace).Get(ctx, name, metav1.GetOptions{})
	duration := time.Since(start)

	if err != nil {
		span.RecordError(err)
		c.recordError("deployments.get", "deployments", err,
			attribute.String("k8s.namespace", namespace),
			attribute.String("k8s.deployment_name", name))
		return nil, fmt.Errorf("failed to get deployment: %w", err)
	}

	d := convertDeployment(*deployment)
	c.recordOperation("deployments.get", "deployments", duration,
		attribute.String("k8s.namespace", namespace),
		attribute.String("k8s.deployment_name", name))
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

	// Get rolling update params
	var maxSurge, maxUnavailable string
	if d.Spec.Strategy.RollingUpdate != nil {
		if d.Spec.Strategy.RollingUpdate.MaxSurge != nil {
			maxSurge = d.Spec.Strategy.RollingUpdate.MaxSurge.String()
		}
		if d.Spec.Strategy.RollingUpdate.MaxUnavailable != nil {
			maxUnavailable = d.Spec.Strategy.RollingUpdate.MaxUnavailable.String()
		}
	}

	// Get pod template image
	var podTemplateImage string
	if len(d.Spec.Template.Spec.Containers) > 0 {
		podTemplateImage = d.Spec.Template.Spec.Containers[0].Image
	}

	// Get revision history limit
	var revisionHistory int32
	if d.Spec.RevisionHistoryLimit != nil {
		revisionHistory = *d.Spec.RevisionHistoryLimit
	}

	// Convert conditions
	conditions := make([]models.DeploymentCondition, 0, len(d.Status.Conditions))
	for _, cond := range d.Status.Conditions {
		conditions = append(conditions, models.DeploymentCondition{
			Type:               string(cond.Type),
			Status:             string(cond.Status),
			LastTransitionTime: cond.LastTransitionTime.Time,
			Reason:             cond.Reason,
			Message:            cond.Message,
		})
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
		Annotations:       d.Annotations,
		Conditions:        conditions,
		MaxSurge:          maxSurge,
		MaxUnavailable:    maxUnavailable,
		PodTemplateImage:  podTemplateImage,
		RevisionHistory:   revisionHistory,
	}
}
