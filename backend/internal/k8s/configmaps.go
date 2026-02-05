package k8s

import (
	"context"
	"fmt"
	"time"

	"github.com/krzyzao/kub/internal/models"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// GetConfigMaps returns all configmaps in the given namespace
func (c *Client) GetConfigMaps(ctx context.Context, namespace string) ([]models.ConfigMap, error) {
	ctx, span := c.tracer.Start(ctx, "k8s.configmaps.list",
		trace.WithAttributes(
			attribute.String("k8s.namespace", namespace),
			attribute.String("k8s.operation", "list"),
		),
	)
	defer span.End()

	start := time.Now()
	listOpts := metav1.ListOptions{}

	var configMapList *corev1.ConfigMapList
	var err error

	if namespace == "" || namespace == "all" {
		configMapList, err = c.Clientset.CoreV1().ConfigMaps("").List(ctx, listOpts)
	} else {
		configMapList, err = c.Clientset.CoreV1().ConfigMaps(namespace).List(ctx, listOpts)
	}

	duration := time.Since(start)

	if err != nil {
		span.RecordError(err)
		c.recordError("configmaps.list", "configmaps", err,
			attribute.String("k8s.namespace", namespace))
		return nil, fmt.Errorf("failed to list configmaps: %w", err)
	}

	configMaps := make([]models.ConfigMap, 0, len(configMapList.Items))
	for _, cm := range configMapList.Items {
		configMaps = append(configMaps, convertConfigMap(cm))
	}

	span.SetAttributes(attribute.Int("k8s.resource_count", len(configMaps)))
	c.recordOperation("configmaps.list", "configmaps", duration,
		attribute.String("k8s.namespace", namespace),
		attribute.Int("k8s.resource_count", len(configMaps)))

	return configMaps, nil
}

// GetConfigMap returns a specific configmap
func (c *Client) GetConfigMap(ctx context.Context, namespace, name string) (*models.ConfigMap, error) {
	ctx, span := c.tracer.Start(ctx, "k8s.configmaps.get",
		trace.WithAttributes(
			attribute.String("k8s.namespace", namespace),
			attribute.String("k8s.configmap_name", name),
			attribute.String("k8s.operation", "get"),
		),
	)
	defer span.End()

	start := time.Now()
	configMap, err := c.Clientset.CoreV1().ConfigMaps(namespace).Get(ctx, name, metav1.GetOptions{})
	duration := time.Since(start)

	if err != nil {
		span.RecordError(err)
		c.recordError("configmaps.get", "configmaps", err,
			attribute.String("k8s.namespace", namespace),
			attribute.String("k8s.configmap_name", name))
		return nil, fmt.Errorf("failed to get configmap: %w", err)
	}

	cm := convertConfigMap(*configMap)
	c.recordOperation("configmaps.get", "configmaps", duration,
		attribute.String("k8s.namespace", namespace),
		attribute.String("k8s.configmap_name", name))
	return &cm, nil
}

func convertConfigMap(cm corev1.ConfigMap) models.ConfigMap {
	// Get data count and keys
	dataCount := len(cm.Data) + len(cm.BinaryData)
	keys := make([]string, 0, dataCount)
	for k := range cm.Data {
		keys = append(keys, k)
	}
	for k := range cm.BinaryData {
		keys = append(keys, k)
	}

	// Convert binary data keys (show size instead of content)
	binaryDataInfo := make(map[string]string)
	for k, v := range cm.BinaryData {
		binaryDataInfo[k] = fmt.Sprintf("<%d bytes>", len(v))
	}

	// Calculate age
	age := formatDuration(time.Since(cm.CreationTimestamp.Time))

	return models.ConfigMap{
		Name:        cm.Name,
		Namespace:   cm.Namespace,
		DataCount:   dataCount,
		Keys:        keys,
		Age:         age,
		CreatedAt:   cm.CreationTimestamp.Time,
		Data:        cm.Data,
		BinaryData:  binaryDataInfo,
		Labels:      cm.Labels,
		Annotations: cm.Annotations,
	}
}
