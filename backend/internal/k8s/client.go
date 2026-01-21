package k8s

import (
	"fmt"
	"os"
	"path/filepath"

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

	return &Client{
		Clientset:     clientset,
		MetricsClient: metricsClient,
		Config:        config,
		RawConfig:     *rawConfig,
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
