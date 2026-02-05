package api

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
	"github.com/krzyzao/kub/internal/config"
	"github.com/krzyzao/kub/internal/k8s"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/metric"
	"go.opentelemetry.io/otel/trace"
)

const (
	// Time allowed to read the next pong message from the client
	pongWait = 60 * time.Second
	// Send pings to client with this period (must be less than pongWait)
	pingPeriod = 30 * time.Second
	// Time allowed to write a message to the client
	writeWait = 10 * time.Second
	// Maximum message size allowed from client
	maxMessageSize = 512
)

// LogStreamHub manages individual log stream connections
type LogStreamHub struct {
	k8sClient    *k8s.Client
	tracer       trace.Tracer
	meter        metric.Meter
	linesStreamed metric.Int64Counter
	streamErrors metric.Int64Counter
}

// NewLogStreamHub creates a new log stream hub
func NewLogStreamHub(k8sClient *k8s.Client) *LogStreamHub {
	tracer := otel.Tracer("kub/websocket/logs")
	meter := otel.Meter("kub/websocket/logs")

	// Initialize metrics
	linesStreamed, _ := meter.Int64Counter(
		"logs.lines.streamed",
		metric.WithDescription("Total number of log lines streamed"),
		metric.WithUnit("{line}"),
	)
	streamErrors, _ := meter.Int64Counter(
		"logs.stream.errors",
		metric.WithDescription("Number of log stream errors"),
		metric.WithUnit("{error}"),
	)

	return &LogStreamHub{
		k8sClient:    k8sClient,
		tracer:       tracer,
		meter:        meter,
		linesStreamed: linesStreamed,
		streamErrors: streamErrors,
	}
}

// logStreamMessage represents a message sent over the WebSocket
type logStreamMessage struct {
	Type string `json:"type"` // 'log', 'error', 'end'
	Data string `json:"data"`
}

// HandleLogStream handles WebSocket connections for log streaming
func (h *LogStreamHub) HandleLogStream(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	// Extract parameters from query
	namespace := r.URL.Query().Get("namespace")
	podName := r.URL.Query().Get("pod")
	container := r.URL.Query().Get("container")
	previous := r.URL.Query().Get("previous") == "true"
	timestamps := r.URL.Query().Get("timestamps") == "true"

	if namespace == "" || podName == "" {
		http.Error(w, "namespace and pod parameters are required", http.StatusBadRequest)
		return
	}

	// Check origin
	if !checkOrigin(r) {
		config.ErrorCtx(ctx, "Rejected log stream WebSocket connection from origin",
			config.String("origin", r.Header.Get("Origin")))
		w.WriteHeader(http.StatusForbidden)
		return
	}

	// Create connection-level span for WebSocket upgrade
	ctx, span := h.tracer.Start(ctx, "ws.logs.stream", trace.WithAttributes(
		attribute.String("ws.endpoint", "/ws/logs"),
		attribute.String("k8s.namespace", namespace),
		attribute.String("k8s.pod_name", podName),
		attribute.String("k8s.container_name", container),
		attribute.Bool("logs.follow", !previous),
	))
	defer span.End()

	// Upgrade to WebSocket
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		config.WithSpanError(ctx, "Failed to upgrade log stream connection", err,
			config.K8SAttribute("namespace", namespace),
			config.K8SAttribute("pod_name", podName))
		span.RecordError(err)
		return
	}
	defer conn.Close()

	span.AddEvent("stream_started")

	// Configure connection for proper timeout handling
	conn.SetReadLimit(maxMessageSize)
	conn.SetReadDeadline(time.Now().Add(pongWait))
	conn.SetPongHandler(func(string) error {
		conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	config.InfoCtx(ctx, "Log stream connected",
		config.K8SAttribute("namespace", namespace),
		config.K8SAttribute("pod_name", podName),
		config.K8SAttribute("container_name", container))

	// Create context for this stream
	streamCtx, cancel := context.WithCancel(ctx)
	defer cancel()

	// Start log stream in goroutine
	logChan := make(chan string)
	errChan := make(chan error)

	go h.streamLogs(streamCtx, namespace, podName, container, previous, timestamps, logChan, errChan)

	// Send ping/pong keepalive
	ticker := time.NewTicker(pingPeriod)
	defer ticker.Stop()

	done := make(chan struct{})

	// Read messages (for close handling)
	go func() {
		defer close(done)
		for {
			_, _, err := conn.ReadMessage()
			if err != nil {
				if !websocket.IsCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
					config.ErrorCtx(ctx, "Log stream WebSocket read error",
						config.Err(err),
						config.K8SAttribute("namespace", namespace),
						config.K8SAttribute("pod_name", podName))
				}
				cancel()
				span.AddEvent("stream_cancelled")
				return
			}
		}
	}()

	// Send logs to client
	for {
		select {
		case <-done:
			return
		case <-streamCtx.Done():
			span.AddEvent("stream_cancelled")
			return
		case line, ok := <-logChan:
			if !ok {
				// Stream ended normally
				sendJSON(conn, logStreamMessage{Type: "end", Data: ""})
				span.AddEvent("stream_eof")
				return
			}
			if err := sendJSON(conn, logStreamMessage{Type: "log", Data: line}); err != nil {
				config.ErrorCtx(ctx, "Error sending log line",
					config.Err(err),
					config.K8SAttribute("namespace", namespace),
					config.K8SAttribute("pod_name", podName))
				h.streamErrors.Add(ctx, 1, metric.WithAttributes(
					attribute.String("k8s.namespace", namespace),
					attribute.String("k8s.pod_name", podName),
					attribute.String("error.type", fmt.Sprintf("%T", err)),
				))
				return
			}
			h.linesStreamed.Add(ctx, 1, metric.WithAttributes(
				attribute.String("k8s.namespace", namespace),
				attribute.String("k8s.pod_name", podName),
			))
		case err, ok := <-errChan:
			if !ok {
				return
			}
			sendJSON(conn, logStreamMessage{Type: "error", Data: err.Error()})
			h.streamErrors.Add(ctx, 1, metric.WithAttributes(
				attribute.String("k8s.namespace", namespace),
				attribute.String("k8s.pod_name", podName),
				attribute.String("error.type", fmt.Sprintf("%T", err)),
			))
			span.RecordError(err)
			span.AddEvent("stream_error")
			return
		case <-ticker.C:
			conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (h *LogStreamHub) streamLogs(
	ctx context.Context,
	namespace, podName, container string,
	previous, timestamps bool,
	logChan chan<- string,
	errChan chan<- error,
) {
	defer close(logChan)
	defer close(errChan)

	logOpts := k8s.LogOptions{
		Container:  container,
		TailLines:  0, // No limit for streaming
		Previous:   previous,
		Timestamps: timestamps,
	}

	stream, err := h.k8sClient.GetPodLogsStream(ctx, namespace, podName, logOpts)
	if err != nil {
		errChan <- fmt.Errorf("failed to get log stream: %w", err)
		return
	}
	defer stream.Close()

	reader := bufio.NewReader(stream)

	for {
		select {
		case <-ctx.Done():
			return
		default:
			line, err := reader.ReadString('\n')
			if err != nil {
				if err == io.EOF {
					return
				}
				// For streaming logs, errors during read are somewhat expected
				// as the pod may be restarting or the connection may timeout
				config.WarnCtx(ctx, "Log stream read error",
					config.Err(err),
					config.K8SAttribute("namespace", namespace),
					config.K8SAttribute("pod_name", podName))
				return
			}

			// Send line (preserving newline for formatting)
			logChan <- line
		}
	}
}

func sendJSON(conn *websocket.Conn, v interface{}) error {
	conn.SetWriteDeadline(time.Now().Add(writeWait))
	data, err := json.Marshal(v)
	if err != nil {
		return err
	}
	return conn.WriteMessage(websocket.TextMessage, data)
}
