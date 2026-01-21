package k8s

import (
	"context"
	"fmt"
	"time"

	"github.com/krzyzao/kub/internal/models"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// GetConfigMaps returns all configmaps in the given namespace
func (c *Client) GetConfigMaps(ctx context.Context, namespace string) ([]models.ConfigMap, error) {
	listOpts := metav1.ListOptions{}

	var configMapList *corev1.ConfigMapList
	var err error

	if namespace == "" || namespace == "all" {
		configMapList, err = c.Clientset.CoreV1().ConfigMaps("").List(ctx, listOpts)
	} else {
		configMapList, err = c.Clientset.CoreV1().ConfigMaps(namespace).List(ctx, listOpts)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to list configmaps: %w", err)
	}

	configMaps := make([]models.ConfigMap, 0, len(configMapList.Items))
	for _, cm := range configMapList.Items {
		configMaps = append(configMaps, convertConfigMap(cm))
	}

	return configMaps, nil
}

// GetConfigMap returns a specific configmap
func (c *Client) GetConfigMap(ctx context.Context, namespace, name string) (*models.ConfigMap, error) {
	configMap, err := c.Clientset.CoreV1().ConfigMaps(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get configmap: %w", err)
	}

	cm := convertConfigMap(*configMap)
	return &cm, nil
}

func convertConfigMap(cm corev1.ConfigMap) models.ConfigMap {
	// Get data count and keys
	dataCount := len(cm.Data)
	keys := make([]string, 0, dataCount)
	for k := range cm.Data {
		keys = append(keys, k)
	}

	// Calculate age
	age := formatDuration(time.Since(cm.CreationTimestamp.Time))

	return models.ConfigMap{
		Name:      cm.Name,
		Namespace: cm.Namespace,
		DataCount: dataCount,
		Keys:      keys,
		Age:       age,
		CreatedAt: cm.CreationTimestamp.Time,
	}
}
