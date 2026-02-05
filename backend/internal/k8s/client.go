package k8s

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/metric"
	"go.opentelemetry.io/otel/trace"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/tools/clientcmd/api"
	metricsv "k8s.io/metrics/pkg/client/clientset/versioned"
)

// Client wraps the Kubernetes client with additional functionality
type Client struct {
	Clientset     *kubernetes.Clientset
	MetricsClient *metricsv.Clientset
	Config        *rest.Config
	RawConfig     api.Config
	tracer        trace.Tracer
	meter         metric.Meter
}

// NewClient creates a new Kubernetes client
func NewClient() (*Client, error) {
	kubeconfig := getKubeConfigPath()

	config, err := clientcmd.BuildConfigFromFlags("", kubeconfig)
	if err != nil {
		return nil, fmt.Errorf("failed to build config: %w", err)
	}

	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, fmt.Errorf("failed to create clientset: %w", err)
	}

	metricsClient, err := metricsv.NewForConfig(config)
	if err != nil {
		return nil, fmt.Errorf("failed to create metrics client: %w", err)
	}

	rawConfig, err := clientcmd.LoadFromFile(kubeconfig)
	if err != nil {
		return nil, fmt.Errorf("failed to load raw config: %w", err)
	}

	// Initialize OpenTelemetry tracer and meter
	tracer := otel.Tracer("kub/k8s")
	meter := otel.Meter("kub/k8s")

	return &Client{
		Clientset:     clientset,
		MetricsClient: metricsClient,
		Config:        config,
		RawConfig:     *rawConfig,
		tracer:        tracer,
		meter:         meter,
	}, nil
}

// SwitchContext switches to a different Kubernetes context
func (c *Client) SwitchContext(contextName string) error {
	kubeconfig := getKubeConfigPath()

	rawConfig, err := clientcmd.LoadFromFile(kubeconfig)
	if err != nil {
		return fmt.Errorf("failed to load config: %w", err)
	}

	if _, exists := rawConfig.Contexts[contextName]; !exists {
		return fmt.Errorf("context %s does not exist", contextName)
	}

	rawConfig.CurrentContext = contextName

	config, err := clientcmd.NewDefaultClientConfig(*rawConfig, &clientcmd.ConfigOverrides{}).ClientConfig()
	if err != nil {
		return fmt.Errorf("failed to create client config: %w", err)
	}

	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return fmt.Errorf("failed to create clientset: %w", err)
	}

	metricsClient, err := metricsv.NewForConfig(config)
	if err != nil {
		return fmt.Errorf("failed to create metrics client: %w", err)
	}

	c.Clientset = clientset
	c.MetricsClient = metricsClient
	c.Config = config
	c.RawConfig = *rawConfig
	// Reinitialize tracer and meter after context switch
	c.tracer = otel.Tracer("kub/k8s")
	c.meter = otel.Meter("kub/k8s")

	return nil
}

// GetContexts returns all available Kubernetes contexts
func (c *Client) GetContexts() ([]string, string) {
	var contexts []string
	for name := range c.RawConfig.Contexts {
		contexts = append(contexts, name)
	}
	return contexts, c.RawConfig.CurrentContext
}

func getKubeConfigPath() string {
	if kubeconfigEnv := os.Getenv("KUBECONFIG"); kubeconfigEnv != "" {
		return kubeconfigEnv
	}
	home, _ := os.UserHomeDir()
	return filepath.Join(home, ".kube", "config")
}

// recordOperation records a successful K8s operation metric
func (c *Client) recordOperation(operation, resource string, duration time.Duration, attributes ...attribute.KeyValue) {
	// Create histogram for operation duration
	durationHist, _ := c.meter.Float64Histogram(
		"k8s.operation.duration",
		metric.WithUnit("ms"),
		metric.WithDescription("Duration of Kubernetes API operations"),
	)
	if durationHist != nil {
		allAttrs := append([]attribute.KeyValue{
			attribute.String("k8s.operation", operation),
			attribute.String("k8s.resource", resource),
		}, attributes...)
		durationHist.Record(context.Background(), float64(duration.Milliseconds()), metric.WithAttributes(allAttrs...))
	}

	// Create counter for operation count
	countCounter, _ := c.meter.Int64Counter(
		"k8s.operation.count",
		metric.WithDescription("Count of Kubernetes API operations"),
	)
	if countCounter != nil {
		allAttrs := append([]attribute.KeyValue{
			attribute.String("k8s.operation", operation),
			attribute.String("k8s.resource", resource),
			attribute.String("result", "success"),
		}, attributes...)
		countCounter.Add(context.Background(), 1, metric.WithAttributes(allAttrs...))
	}
}

// recordError records a K8s operation error metric
func (c *Client) recordError(operation, resource string, err error, attributes ...attribute.KeyValue) {
	errorCounter, _ := c.meter.Int64Counter(
		"k8s.errors",
		metric.WithDescription("Count of Kubernetes API errors"),
	)
	if errorCounter != nil {
		errorType := "unknown"
		if err != nil {
			errorType = err.Error()
			// Truncate long error messages
			if len(errorType) > 50 {
				errorType = errorType[:50]
			}
		}
		allAttrs := append([]attribute.KeyValue{
			attribute.String("k8s.operation", operation),
			attribute.String("k8s.resource", resource),
			attribute.String("k8s.error_type", errorType),
		}, attributes...)
		errorCounter.Add(context.Background(), 1, metric.WithAttributes(allAttrs...))
	}
}
