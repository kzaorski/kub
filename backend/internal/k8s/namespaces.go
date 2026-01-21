package k8s

import (
	"context"
	"fmt"

	"github.com/krzyzao/kub/internal/models"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// GetNamespaces returns all namespaces in the cluster
func (c *Client) GetNamespaces(ctx context.Context) ([]models.Namespace, error) {
	nsList, err := c.Clientset.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list namespaces: %w", err)
	}

	namespaces := make([]models.Namespace, 0, len(nsList.Items))
	for _, ns := range nsList.Items {
		namespaces = append(namespaces, models.Namespace{
			Name:   ns.Name,
			Status: string(ns.Status.Phase),
		})
	}

	return namespaces, nil
}
