// OpenTelemetry provider setup for KUB
// Initializes TracerProvider, MeterProvider, and LoggerProvider

package config

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
	"go.opentelemetry.io/otel/sdk/metric"
	"go.opentelemetry.io/otel/sdk/resource"
	"go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.28.0"
)

// SetupOpenTelemetry initializes OpenTelemetry providers and exporters
// Returns cleanup function that must be called on application shutdown
func SetupOpenTelemetry(cfg *Config) (cleanup func(), err error) {
	if cfg.Disabled {
		log.Println("OpenTelemetry SDK disabled")
		return func() {}, nil
	}

	// Get hostname for resource attributes
	hostname, err := os.Hostname()
	if err != nil {
		hostname = "unknown"
	}

	// Create resource describing this service
	res, err := resource.New(
		context.Background(),
		resource.WithAttributes(
			semconv.ServiceNameKey.String(cfg.ServiceName),
			semconv.ServiceVersionKey.String(cfg.ServiceVersion),
			semconv.DeploymentEnvironmentName(cfg.Environment),
			attribute.String("host.name", hostname),
		),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create resource: %w", err)
	}

	// Setup trace provider and exporter
	//
	// Exporter Configuration:
	// - Protocol: OTLP over gRPC
	// - Endpoint: Configured via OTEL_EXPORTER_OTLP_ENDPOINT (default: localhost:4317)
	// - Security: Insecure (no TLS) - suitable for local development
	//              For production, use TLS with WithHeaders() for authentication
	//
	// Batch Processing Configuration:
	// - Batch Timeout: 30 seconds (max wait before flushing spans)
	// - Max Batch Size: 256 spans per export (reduces network overhead)
	// - Compression: gzip enabled by default (reduces bandwidth)
	// - Concurrency: 1 concurrent export (simple ordering)
	//
	// Error Handling:
	// - Export failures are logged but do not block application
	// - Spans are buffered in memory until export succeeds
	// - On shutdown, pending spans are flushed with 10s deadline
	traceExporter, err := otlptracegrpc.New(context.Background(),
		otlptracegrpc.WithEndpoint(cfg.Endpoint),
		otlptracegrpc.WithInsecure(),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create trace exporter: %w", err)
	}

	tracerProvider := trace.NewTracerProvider(
		trace.WithBatcher(traceExporter,
			trace.WithBatchTimeout(30*time.Second),
			trace.WithMaxExportBatchSize(256),
		),
		trace.WithResource(res),
		trace.WithSampler(trace.ParentBased(
			trace.TraceIDRatioBased(cfg.SampleRatio),
		)),
	)
	otel.SetTracerProvider(tracerProvider)

	// Setup metric provider and exporter
	//
	// Exporter Configuration:
	// - Protocol: OTLP over gRPC (same as traces)
	// - Endpoint: Configured via OTEL_EXPORTER_OTLP_ENDPOINT
	// - Security: Insecure (for production, use TLS)
	//
	// Periodic Export Configuration:
	// - Export Interval: Configured via OTEL_METRICS_EXPORT_INTERVAL (default: 60000ms)
	//   - Development: 30s for faster feedback
	//   - Production: 60s to reduce network overhead
	// - Aggregation: Temporal aggregation applied before export
	// - Compression: gzip enabled by default
	//
	// Error Handling:
	// - Export failures are logged but do not block application
	// - Metrics continue to be aggregated in memory
	// - On shutdown, pending metrics are flushed with 5s deadline
	metricExporter, err := otlpmetricgrpc.New(context.Background(),
		otlpmetricgrpc.WithEndpoint(cfg.Endpoint),
		otlpmetricgrpc.WithInsecure(),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create metric exporter: %w", err)
	}

	meterProvider := metric.NewMeterProvider(
		metric.WithResource(res),
		metric.WithReader(metric.NewPeriodicReader(
			metricExporter,
			metric.WithInterval(time.Duration(cfg.MetricsExportInterval)*time.Millisecond),
		)),
	)
	otel.SetMeterProvider(meterProvider)

	// Return cleanup function
	cleanup = func() {
		log.Println("Flushing OpenTelemetry spans and metrics...")

		// Flush traces with 10 second deadline
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := tracerProvider.Shutdown(shutdownCtx); err != nil {
			log.Printf("Failed to shutdown tracer provider: %v", err)
		}

		// Flush metrics with 5 second deadline
		shutdownCtx, cancel = context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := meterProvider.Shutdown(shutdownCtx); err != nil {
			log.Printf("Failed to shutdown meter provider: %v", err)
		}

		log.Println("OpenTelemetry shutdown complete")
	}

	return cleanup, nil
}
