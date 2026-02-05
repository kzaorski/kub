package api

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/krzyzao/kub/internal/config"
	"github.com/krzyzao/kub/internal/k8s"
	"github.com/krzyzao/kub/internal/models"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/metric"
	"go.opentelemetry.io/otel/trace"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/watch"
)

// GetAllowedOrigins returns the list of allowed origins from env or defaults
func GetAllowedOrigins() []string {
	originsEnv := os.Getenv("ALLOWED_ORIGINS")
	if originsEnv != "" {
		origins := strings.Split(originsEnv, ",")
		for i := range origins {
			origins[i] = strings.TrimSpace(origins[i])
		}
		return origins
	}
	return []string{"http://localhost:5173", "http://localhost:8080"}
}

func checkOrigin(r *http.Request) bool {
	origin := r.Header.Get("Origin")
	if origin == "" {
		return true // Allow requests without Origin header (same-origin)
	}
	allowedOrigins := GetAllowedOrigins()
	for _, allowed := range allowedOrigins {
		if origin == allowed {
			return true
		}
	}
	config.ErrorCtx(context.Background(), "Rejected WebSocket connection from origin",
		config.String("origin", origin))
	return false
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin:     checkOrigin,
}

// Hub manages WebSocket connections and broadcasts
type Hub struct {
	k8sClient  *k8s.Client
	tracer     trace.Tracer
	meter      metric.Meter
	clients    map[*websocket.Conn]bool
	broadcast  chan []byte
	register   chan *websocket.Conn
	unregister chan *websocket.Conn
	mu         sync.RWMutex

	// Metrics
	connectionsActive  metric.Int64UpDownCounter
	messagesSent       metric.Int64Counter
	initialDataLatency metric.Float64Histogram
	broadcastErrors    metric.Int64Counter

	// Watcher metrics
	podEvents      metric.Int64Counter
	podReconnects  metric.Int64Counter
	metricsDuration metric.Float64Histogram
	metricsErrors   metric.Int64Counter
	metricsFetchCount metric.Int64Counter
}

// NewHub creates a new WebSocket hub
func NewHub(k8sClient *k8s.Client) *Hub {
	tracer := otel.Tracer("kub/websocket")
	meter := otel.Meter("kub/websocket")

	// Initialize metrics
	connectionsActive, _ := meter.Int64UpDownCounter(
		"ws.connections.active",
		metric.WithDescription("Current number of active WebSocket connections"),
		metric.WithUnit("{connection}"),
	)
	messagesSent, _ := meter.Int64Counter(
		"ws.messages.sent",
		metric.WithDescription("Total number of WebSocket messages sent"),
		metric.WithUnit("{message}"),
	)
	initialDataLatency, _ := meter.Float64Histogram(
		"ws.initial_data.latency",
		metric.WithDescription("Initial data fetch latency in milliseconds"),
		metric.WithUnit("ms"),
	)
	broadcastErrors, _ := meter.Int64Counter(
		"ws.broadcast.errors",
		metric.WithDescription("Number of failed WebSocket broadcast sends"),
		metric.WithUnit("{error}"),
	)

	// Watcher metrics
	podEvents, _ := meter.Int64Counter(
		"watcher.pod.events",
		metric.WithDescription("Number of pod watch events received"),
		metric.WithUnit("{event}"),
	)
	podReconnects, _ := meter.Int64Counter(
		"watcher.pod.reconnects",
		metric.WithDescription("Number of pod watcher reconnection attempts"),
		metric.WithUnit("{reconnection}"),
	)
	metricsDuration, _ := meter.Float64Histogram(
		"watcher.metrics.duration",
		metric.WithDescription("Metrics watcher fetch duration in milliseconds"),
		metric.WithUnit("ms"),
	)
	metricsErrors, _ := meter.Int64Counter(
		"watcher.metrics.errors",
		metric.WithDescription("Number of metrics watcher fetch errors"),
		metric.WithUnit("{error}"),
	)
	metricsFetchCount, _ := meter.Int64Counter(
		"watcher.metrics.fetch.count",
		metric.WithDescription("Total number of metrics fetch cycles"),
		metric.WithUnit("{fetch}"),
	)

	return &Hub{
		k8sClient:          k8sClient,
		tracer:             tracer,
		meter:              meter,
		clients:            make(map[*websocket.Conn]bool),
		broadcast:          make(chan []byte, 256),
		register:           make(chan *websocket.Conn),
		unregister:         make(chan *websocket.Conn),
		connectionsActive:  connectionsActive,
		messagesSent:       messagesSent,
		initialDataLatency: initialDataLatency,
		broadcastErrors:    broadcastErrors,
		podEvents:          podEvents,
		podReconnects:      podReconnects,
		metricsDuration:    metricsDuration,
		metricsErrors:      metricsErrors,
		metricsFetchCount:  metricsFetchCount,
	}
}

// Run starts the hub
func (h *Hub) Run(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		case conn := <-h.register:
			h.mu.Lock()
			h.clients[conn] = true
			h.mu.Unlock()
			h.connectionsActive.Add(ctx, 1, metric.WithAttributes(attribute.String("ws.endpoint", "/ws")))
			log.Printf("Client connected. Total clients: %d", len(h.clients))
		case conn := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[conn]; ok {
				delete(h.clients, conn)
				conn.Close()
			}
			h.mu.Unlock()
			h.connectionsActive.Add(ctx, -1, metric.WithAttributes(attribute.String("ws.endpoint", "/ws")))
			log.Printf("Client disconnected. Total clients: %d", len(h.clients))
		case message := <-h.broadcast:
			h.mu.RLock()
			var failedConns []*websocket.Conn

			// Extract message type from JSON for metrics
			messageType := "unknown"
			var rawMsg map[string]interface{}
			if err := json.Unmarshal(message, &rawMsg); err == nil {
				if msgType, ok := rawMsg["type"].(string); ok {
					messageType = msgType
				}
			}

			for conn := range h.clients {
				err := conn.WriteMessage(websocket.TextMessage, message)
				if err != nil {
					log.Printf("Error sending message: %v", err)
					h.broadcastErrors.Add(ctx, 1, metric.WithAttributes(
						attribute.String("ws.message_type", messageType),
						attribute.String("error.type", fmt.Sprintf("%T", err)),
					))
					failedConns = append(failedConns, conn)
				} else {
					h.messagesSent.Add(ctx, 1, metric.WithAttributes(attribute.String("ws.message_type", messageType)))
				}
			}
			h.mu.RUnlock()
			// Clean up failed connections with write lock
			if len(failedConns) > 0 {
				h.mu.Lock()
				for _, conn := range failedConns {
					if _, ok := h.clients[conn]; ok {
						delete(h.clients, conn)
						conn.Close()
					}
				}
				h.mu.Unlock()
			}
		}
	}
}

// StartPodWatcher starts watching pods and broadcasting changes
func (h *Hub) StartPodWatcher(ctx context.Context, namespace string) {
	reconnectCount := 0

	for {
		select {
		case <-ctx.Done():
			return
		default:
			// Create session-level span for this watch session
			ctx, span := h.tracer.Start(ctx, "watcher.pod.session", trace.WithAttributes(
				attribute.String("watcher.type", "pod"),
				attribute.String("k8s.namespace", namespace),
				attribute.Int("reconnect.count", reconnectCount),
			))

			watcher, err := h.k8sClient.WatchPods(ctx, namespace)
			if err != nil {
				config.WithSpanError(ctx, "Failed to start pod watcher", err,
					config.K8SAttribute("namespace", namespace))
				span.RecordError(err)
				span.End()

				// Record reconnection metric
				h.podReconnects.Add(ctx, 1, metric.WithAttributes(
					attribute.String("k8s.namespace", namespace),
				))
				reconnectCount++
				time.Sleep(5 * time.Second)
				continue
			}

			span.AddEvent("watch_started")
			span.End()

			h.handlePodWatch(ctx, namespace, reconnectCount, watcher)
			reconnectCount++
		}
	}
}

func (h *Hub) handlePodWatch(ctx context.Context, namespace string, reconnectCount int, watcher watch.Interface) {
	defer watcher.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case event, ok := <-watcher.ResultChan():
			if !ok {
				config.WarnCtx(ctx, "Pod watcher channel closed, reconnecting",
					config.WatcherAttribute("type", "pod"),
					config.K8SAttribute("namespace", namespace))
				// Record reconnection metric for watch closure
				h.podReconnects.Add(ctx, 1, metric.WithAttributes(
					attribute.String("k8s.namespace", namespace),
					attribute.String("reconnect.reason", "channel_closed"),
				))
				return
			}

			pod, ok := event.Object.(*corev1.Pod)
			if !ok {
				continue
			}

			// Record pod event metric
			h.podEvents.Add(ctx, 1, metric.WithAttributes(
				attribute.String("k8s.namespace", namespace),
				attribute.String("event.type", string(event.Type)),
			))

			// Add span event for ERROR type events only
			if event.Type == watch.Error {
				// This is an error event from the watch API
				config.WarnCtx(ctx, "Pod watch error event",
					config.String("event.object", fmt.Sprintf("%v", event.Object)),
					config.K8SAttribute("namespace", namespace))
			}

			podEvent := models.PodEvent{
				Type:      string(event.Type),
				Pod:       convertK8sPod(*pod),
				Timestamp: time.Now().UnixMilli(),
			}

			data, err := json.Marshal(map[string]interface{}{
				"type": "pod",
				"data": podEvent,
			})
			if err != nil {
				config.ErrorCtx(ctx, "Failed to marshal pod event", config.Err(err))
				continue
			}

			h.broadcast <- data
		}
	}
}

// StartMetricsWatcher periodically fetches and broadcasts metrics
func (h *Hub) StartMetricsWatcher(ctx context.Context, namespace string, interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	fetchNumber := 0

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			// Create span for this fetch cycle
			ctx, span := h.tracer.Start(ctx, "watcher.metrics.fetch", trace.WithAttributes(
				attribute.String("k8s.namespace", namespace),
				attribute.Int("fetch.number", fetchNumber),
			))

			start := time.Now()
			h.broadcastMetrics(ctx, namespace)
			durationMs := float64(time.Since(start).Milliseconds())

			// Record metrics
			h.metricsDuration.Record(ctx, durationMs, metric.WithAttributes(
				attribute.String("k8s.namespace", namespace),
			))
			h.metricsFetchCount.Add(ctx, 1, metric.WithAttributes(
				attribute.String("k8s.namespace", namespace),
			))

			span.SetAttributes(attribute.Float64("duration.ms", durationMs))
			span.AddEvent("metrics_broadcasted")
			span.End()

			fetchNumber++
		}
	}
}

func (h *Hub) broadcastMetrics(ctx context.Context, namespace string) {
	nodeMetrics, err := h.k8sClient.GetNodeMetrics(ctx)
	if err != nil {
		config.WithSpanError(ctx, "Failed to get node metrics", err,
			config.K8SAttribute("namespace", namespace))
		h.metricsErrors.Add(ctx, 1, metric.WithAttributes(
			attribute.String("k8s.namespace", namespace),
			attribute.String("metrics.resource", "nodes"),
			attribute.String("error.type", fmt.Sprintf("%T", err)),
		))
		nodeMetrics = []models.NodeMetrics{}
	}

	podMetrics, err := h.k8sClient.GetPodMetrics(ctx, namespace)
	if err != nil {
		config.WithSpanError(ctx, "Failed to get pod metrics", err,
			config.K8SAttribute("namespace", namespace))
		h.metricsErrors.Add(ctx, 1, metric.WithAttributes(
			attribute.String("k8s.namespace", namespace),
			attribute.String("metrics.resource", "pods"),
			attribute.String("error.type", fmt.Sprintf("%T", err)),
		))
		podMetrics = []models.PodMetrics{}
	}

	snapshot := models.MetricsSnapshot{
		Timestamp:   time.Now().UnixMilli(),
		NodeMetrics: nodeMetrics,
		PodMetrics:  podMetrics,
	}

	data, err := json.Marshal(map[string]interface{}{
		"type": "metrics",
		"data": snapshot,
	})
	if err != nil {
		config.WithSpanError(ctx, "Failed to marshal metrics", err,
			config.K8SAttribute("namespace", namespace))
		h.metricsErrors.Add(ctx, 1, metric.WithAttributes(
			attribute.String("k8s.namespace", namespace),
			attribute.String("metrics.resource", "marshal"),
			attribute.String("error.type", fmt.Sprintf("%T", err)),
		))
		return
	}

	h.broadcast <- data
}

// HandleWebSocket handles WebSocket connections
func (h *Hub) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	namespace := r.URL.Query().Get("namespace")

	// Create connection-level span for WebSocket upgrade
	ctx, span := h.tracer.Start(ctx, "ws.upgrade", trace.WithAttributes(
		attribute.String("ws.endpoint", "/ws"),
		attribute.String("ws.namespace", namespace),
	))
	defer span.End()

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		config.WithSpanError(ctx, "Failed to upgrade WebSocket connection", err,
			config.WSAttribute("namespace", namespace))
		span.RecordError(err)
		return
	}

	// Add connection ID attribute
	connID := fmt.Sprintf("%p", conn)
	span.SetAttributes(attribute.String("ws.connection_id", connID))

	h.register <- conn

	// Send initial data with context that includes trace
	go h.sendInitialData(ctx, conn, namespace)

	// Start ping/pong keepalive
	go h.writePump(conn)

	// Read messages (for ping/pong and close handling)
	h.readPump(conn)
}

func (h *Hub) writePump(conn *websocket.Conn) {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
			return
		}
	}
}

func (h *Hub) sendInitialData(ctx context.Context, conn *websocket.Conn, namespace string) {
	start := time.Now()
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	// Create span for initial data fetch
	ctx, span := h.tracer.Start(ctx, "ws.initial_data", trace.WithAttributes(
		attribute.String("ws.namespace", namespace),
	))
	defer span.End()

	// Send pods with metrics
	{
		ctx, podsSpan := h.tracer.Start(ctx, "ws.fetch_pods")
		pods, err := h.k8sClient.GetPods(ctx, namespace)
		if err != nil {
			config.WithSpanError(ctx, "Failed to get initial pods", err,
				config.K8SAttribute("namespace", namespace))
			podsSpan.RecordError(err)
		} else {
			podsSpan.SetAttributes(attribute.Int("k8s.resource_count", len(pods)))

			// Merge pod metrics into pods
			podMetrics, metricsErr := h.k8sClient.GetPodMetrics(ctx, namespace)
			if metricsErr == nil {
				metricsMap := make(map[string]models.PodMetrics)
				for _, m := range podMetrics {
					key := m.Namespace + "/" + m.Name
					metricsMap[key] = m
				}
				for i := range pods {
					key := pods[i].Namespace + "/" + pods[i].Name
					if m, ok := metricsMap[key]; ok {
						pods[i].CPUUsage = m.CPUUsage
						pods[i].MemoryUsage = m.MemoryUsage
					}
				}
			}
			data, _ := json.Marshal(map[string]interface{}{
				"type": "pods",
				"data": pods,
			})
			conn.WriteMessage(websocket.TextMessage, data)
			span.AddEvent("pods_sent")
		}
		podsSpan.End()
	}

	// Send cluster summary (namespace-aware)
	{
		ctx, summarySpan := h.tracer.Start(ctx, "ws.fetch_summary")
		summary, err := h.k8sClient.GetClusterSummary(ctx, namespace)
		if err != nil {
			config.WithSpanError(ctx, "Failed to get cluster summary", err,
				config.K8SAttribute("namespace", namespace))
			summarySpan.RecordError(err)
		} else {
			data, _ := json.Marshal(map[string]interface{}{
				"type": "summary",
				"data": summary,
			})
			conn.WriteMessage(websocket.TextMessage, data)
			span.AddEvent("summary_sent")
		}
		summarySpan.End()
	}

	// Send initial metrics
	{
		ctx, metricsSpan := h.tracer.Start(ctx, "ws.fetch_metrics")
		h.broadcastMetrics(ctx, namespace)
		span.AddEvent("metrics_sent")
		metricsSpan.End()
	}

	// Record initial data latency
	latencyMs := float64(time.Since(start).Milliseconds())
	h.initialDataLatency.Record(ctx, latencyMs, metric.WithAttributes(attribute.String("ws.namespace", namespace)))
}

func (h *Hub) readPump(conn *websocket.Conn) {
	defer func() {
		h.unregister <- conn
	}()

	conn.SetReadLimit(512)
	conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	conn.SetPongHandler(func(string) error {
		conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				config.ErrorCtx(context.Background(), "WebSocket error",
					config.Err(err),
					config.String("error.type", fmt.Sprintf("%T", err)))
			}
			break
		}

		// Handle incoming messages (e.g., namespace changes)
		var msg map[string]string
		if err := json.Unmarshal(message, &msg); err == nil {
			if msg["type"] == "subscribe" {
				// Client wants to subscribe to a different namespace
				config.InfoCtx(context.Background(), "Client subscribed to namespace",
					config.String("namespace", msg["namespace"]))
			}
		}
	}
}

func convertK8sPod(p corev1.Pod) models.Pod {
	containers := make([]models.Container, 0, len(p.Spec.Containers))

	for _, c := range p.Spec.Containers {
		container := models.Container{
			Name:  c.Name,
			Image: c.Image,
		}

		for _, cs := range p.Status.ContainerStatuses {
			if cs.Name == c.Name {
				container.Ready = cs.Ready
				container.RestartCount = cs.RestartCount
				if cs.State.Running != nil {
					container.State = "Running"
				} else if cs.State.Waiting != nil {
					container.State = cs.State.Waiting.Reason
				} else if cs.State.Terminated != nil {
					container.State = cs.State.Terminated.Reason
				}
				break
			}
		}

		containers = append(containers, container)
	}

	readyCount := 0
	totalCount := len(p.Status.ContainerStatuses)
	var totalRestarts int32 = 0

	for _, cs := range p.Status.ContainerStatuses {
		if cs.Ready {
			readyCount++
		}
		totalRestarts += cs.RestartCount
	}

	status := string(p.Status.Phase)
	if p.DeletionTimestamp != nil {
		status = "Terminating"
	}

	return models.Pod{
		Name:       p.Name,
		Namespace:  p.Namespace,
		Status:     status,
		Phase:      string(p.Status.Phase),
		Ready:      formatReady(readyCount, totalCount),
		Restarts:   totalRestarts,
		IP:         p.Status.PodIP,
		Node:       p.Spec.NodeName,
		Labels:     p.Labels,
		CreatedAt:  p.CreationTimestamp.Time,
		Containers: containers,
	}
}

func formatReady(ready, total int) string {
	return string(rune('0'+ready)) + "/" + string(rune('0'+total))
}
