// OpenTelemetry configuration for KUB
// Loads OTel settings from environment variables with sensible defaults

package config

import (
	"os"
	"strconv"
)

// Config holds OpenTelemetry configuration loaded from environment variables
type Config struct {
	// OTLP endpoint (e.g., "localhost:4317" or "otel-collector:4317")
	Endpoint string

	// Service name (e.g., "kub")
	ServiceName string

	// Service version (e.g., "1.0.0")
	ServiceVersion string

	// Environment (e.g., "development", "staging", "production")
	Environment string

	// Sampling ratio (0.0-1.0): 1.0 = 100%, 0.1 = 10%
	SampleRatio float64

	// Metrics export interval in milliseconds
	MetricsExportInterval int

	// Whether OTel SDK is disabled
	Disabled bool
}

// LoadOpenTelemetryConfig loads configuration from environment variables
// Returns Config struct with sensible defaults for unset variables
func LoadOpenTelemetryConfig() *Config {
	cfg := &Config{
		Endpoint:              getEnvOrDefault("OTEL_EXPORTER_OTLP_ENDPOINT", "localhost:4317"),
		ServiceName:           getEnvOrDefault("OTEL_SERVICE_NAME", "kub"),
		ServiceVersion:        getEnvOrDefault("OTEL_SERVICE_VERSION", "1.0.0"),
		Environment:           getEnvOrDefault("OTEL_ENVIRONMENT", "development"),
		SampleRatio:           getFloatEnvOrDefault("OTEL_TRACES_SAMPLE_RATIO", 0.1),
		MetricsExportInterval: getIntEnvOrDefault("OTEL_METRICS_EXPORT_INTERVAL", 60000),
		Disabled:              getBoolEnvOrDefault("OTEL_SDK_DISABLED", false),
	}

	// Validate configuration
	if cfg.SampleRatio < 0.0 || cfg.SampleRatio > 1.0 {
		// Invalid sample ratio, default to 10%
		cfg.SampleRatio = 0.1
	}

	if cfg.MetricsExportInterval < 1000 {
		// Minimum 1 second interval
		cfg.MetricsExportInterval = 1000
	}

	return cfg
}

// Helper functions for environment variable parsing with defaults

func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getFloatEnvOrDefault(key string, defaultValue float64) float64 {
	if value := os.Getenv(key); value != "" {
		if f, err := strconv.ParseFloat(value, 64); err == nil {
			return f
		}
	}
	return defaultValue
}

func getIntEnvOrDefault(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if i, err := strconv.Atoi(value); err == nil {
			return i
		}
	}
	return defaultValue
}

func getBoolEnvOrDefault(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		return value == "true" || value == "1" || value == "yes"
	}
	return defaultValue
}
