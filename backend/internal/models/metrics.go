// OpenTelemetry Metrics Definitions for KUB
//
// This file documents all metrics collected throughout the KUB application.
// Each metric is defined with:
//   - Name: OpenTelemetry metric name (snake_case)
//   - Type: Histogram, Counter, or UpDownCounter
//   - Unit: Measurement unit (ms, {connection}, {message}, etc.)
//   - Description: Human-readable description
//   - Dimensions (Attributes): Available dimensions for aggregation
//
// Metrics are organized by category: HTTP, WebSocket, K8s Client, Watchers, Hub, Logs

package models

// HTTP Metrics
// Automatically collected by otelchi middleware (Stage 2)
const (
	// http.server.duration measures the duration of incoming HTTP requests
	// Type: Histogram
	// Unit: ms (milliseconds)
	// Description: Duration of HTTP requests by method, route, and status code
	// Dimensions:
	//   - http.method: GET, POST, etc.
	//   - http.route: /api/pods, /api/nodes, etc.
	//   - http.status_code: 200, 404, 500, etc.
	//   - http.scheme: http or https
	HTTPServerDuration = "http.server.duration"

	// http.server.request.count counts incoming HTTP requests
	// Type: Counter
	// Unit: {request}
	// Description: Number of incoming HTTP requests
	// Dimensions: Same as http.server.duration
	HTTPServerRequestCount = "http.server.request.count"

	// http.server.response.count counts HTTP responses
	// Type: Counter
	// Unit: {response}
	// Description: Number of HTTP responses
	// Dimensions: Same as http.server.duration
	HTTPServerResponseCount = "http.server.response.count"
)

// WebSocket Connection Metrics (Stage 4)
const (
	// ws.connections.active tracks current WebSocket connections
	// Type: UpDownCounter
	// Unit: {connection}
	// Description: Current number of active WebSocket connections
	// Dimensions:
	//   - ws.endpoint: /ws, /ws/logs
	WSConnectionsActive = "ws.connections.active"

	// ws.messages.sent counts WebSocket messages sent
	// Type: Counter
	// Unit: {message}
	// Description: Total number of WebSocket messages sent
	// Dimensions:
	//   - ws.message_type: pod, metrics, summary, log
	WSMessagesSent = "ws.messages.sent"

	// ws.initial_data.latency measures initial data fetch time
	// Type: Histogram
	// Unit: ms (milliseconds)
	// Description: Time to send initial data to new WebSocket connection
	// Dimensions:
	//   - ws.namespace: Kubernetes namespace
	WSInitialDataLatency = "ws.initial_data.latency"

	// ws.broadcast.errors counts failed broadcast sends
	// Type: Counter
	// Unit: {error}
	// Description: Number of failed WebSocket broadcast sends
	// Dimensions:
	//   - ws.message_type: Type of message that failed
	//   - error.type: Error type (e.g., *websocket.CloseError)
	WSBroadcastErrors = "ws.broadcast.errors"
)

// Kubernetes Client Metrics (Stage 3)
const (
	// k8s.operation.duration measures K8s API operation duration
	// Type: Histogram
	// Unit: ms (milliseconds)
	// Description: Duration of Kubernetes API client operations
	// Dimensions:
	//   - k8s.operation: list, get, watch, delete
	//   - k8s.resource_type: pods, nodes, deployments, services, configmaps, events, logs
	//   - k8s.namespace: Kubernetes namespace (if applicable)
	K8sOperationDuration = "k8s.operation.duration"

	// k8s.operation.count counts K8s API operations
	// Type: Counter
	// Unit: {operation}
	// Description: Total number of Kubernetes API client operations
	// Dimensions: Same as k8s.operation.duration
	K8sOperationCount = "k8s.operation.count"

	// k8s.errors counts K8s API errors
	// Type: Counter
	// Unit: {error}
	// Description: Number of Kubernetes API operation errors
	// Dimensions:
	//   - k8s.operation: Operation that failed
	//   - k8s.resource_type: Resource type
	//   - k8s.namespace: Namespace (if applicable)
	//   - k8s.error_type: NotFound, Unauthorized, Timeout, etc.
	K8sErrors = "k8s.errors"
)

// Pod Watcher Metrics (Stage 5)
const (
	// watcher.pod.events counts pod watch events
	// Type: Counter
	// Unit: {event}
	// Description: Number of pod watch events received from Kubernetes API
	// Dimensions:
	//   - k8s.namespace: Kubernetes namespace
	//   - event.type: ADDED, MODIFIED, DELETED, ERROR
	WatcherPodEvents = "watcher.pod.events"

	// watcher.pod.reconnects counts pod watcher reconnections
	// Type: Counter
	// Unit: {reconnection}
	// Description: Number of pod watcher reconnection attempts
	// Dimensions:
	//   - k8s.namespace: Kubernetes namespace
	//   - reconnect.reason: channel_closed, error, etc.
	WatcherPodReconnects = "watcher.pod.reconnects"
)

// Metrics Watcher Metrics (Stage 5)
const (
	// watcher.metrics.duration measures metrics fetch duration
	// Type: Histogram
	// Unit: ms (milliseconds)
	// Description: Duration of metrics watcher fetch cycles
	// Dimensions:
	//   - k8s.namespace: Kubernetes namespace
	WatcherMetricsDuration = "watcher.metrics.duration"

	// watcher.metrics.errors counts metrics fetch errors
	// Type: Counter
	// Unit: {error}
	// Description: Number of metrics watcher fetch errors
	// Dimensions:
	//   - k8s.namespace: Kubernetes namespace
	//   - metrics.resource: nodes, pods, marshal
	//   - error.type: Error type
	WatcherMetricsErrors = "watcher.metrics.errors"

	// watcher.metrics.fetch.count counts metrics fetch cycles
	// Type: Counter
	// Unit: {fetch}
	// Description: Total number of metrics watcher fetch cycles
	// Dimensions:
	//   - k8s.namespace: Kubernetes namespace
	WatcherMetricsFetchCount = "watcher.metrics.fetch.count"
)

// Log Streaming Metrics (Stage 4)
const (
	// logs.lines.streamed counts log lines streamed
	// Type: Counter
	// Unit: {line}
	// Description: Total number of log lines streamed to clients
	// Dimensions:
	//   - k8s.namespace: Kubernetes namespace
	//   - k8s.pod_name: Pod name
	LogsLinesStreamed = "logs.lines.streamed"

	// logs.stream.errors counts log stream errors
	// Type: Counter
	// Unit: {error}
	// Description: Number of log stream errors
	// Dimensions:
	//   - k8s.namespace: Kubernetes namespace
	//   - k8s.pod_name: Pod name
	//   - error.type: Error type
	LogsStreamErrors = "logs.stream.errors"
)

// Metrics Categories
//
// HTTP Metrics:
//   - http.server.duration: Request latency histogram
//   - http.server.request.count: Request counter
//   - http.server.response.count: Response counter
//
// WebSocket Metrics:
//   - ws.connections.active: Current active connections (UpDownCounter)
//   - ws.messages.sent: Total messages sent (Counter)
//   - ws.initial_data.latency: Initial data fetch time (Histogram)
//   - ws.broadcast.errors: Failed broadcast sends (Counter)
//
// Kubernetes Client Metrics:
//   - k8s.operation.duration: K8s API call duration (Histogram)
//   - k8s.operation.count: K8s API call counter (Counter)
//   - k8s.errors: K8s API errors (Counter)
//
// Watcher Metrics:
//   - watcher.pod.events: Pod watch event counter (Counter)
//   - watcher.pod.reconnects: Pod watcher reconnections (Counter)
//   - watcher.metrics.duration: Metrics fetch duration (Histogram)
//   - watcher.metrics.errors: Metrics fetch errors (Counter)
//   - watcher.metrics.fetch.count: Metrics fetch cycles (Counter)
//
// Log Streaming Metrics:
//   - logs.lines.streamed: Log lines sent (Counter)
//   - logs.stream.errors: Stream errors (Counter)

// Metric Naming Conventions
//
// All metrics follow OpenTelemetry semantic conventions:
//   - Use snake_case for metric names
//   - Use dot notation to group related metrics: domain.entity.metric
//   - Use descriptive units: ms for milliseconds, {item} for dimensionless counts
//   - Prefix with domain: http.*, ws.*, k8s.*, watcher.*, logs.*
//
// Attribute Naming Conventions
//
// Attributes follow OpenTelemetry semantic conventions:
//   - Use lowercase snake_case
//   - Use category prefixes: http.*, ws.*, k8s.*, event.*, error.*
//   - Use descriptive names: http.method, k8s.namespace, error.type
