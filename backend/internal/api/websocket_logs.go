package api

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
	"github.com/krzyzao/kub/internal/k8s"
)

// LogStreamHub manages individual log stream connections
type LogStreamHub struct {
	k8sClient *k8s.Client
}

// NewLogStreamHub creates a new log stream hub
func NewLogStreamHub(k8sClient *k8s.Client) *LogStreamHub {
	return &LogStreamHub{
		k8sClient: k8sClient,
	}
}

// logStreamMessage represents a message sent over the WebSocket
type logStreamMessage struct {
	Type string `json:"type"` // 'log', 'error', 'end'
	Data string `json:"data"`
}

// HandleLogStream handles WebSocket connections for log streaming
func (h *LogStreamHub) HandleLogStream(w http.ResponseWriter, r *http.Request) {
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
		log.Printf("Rejected log stream WebSocket connection from origin: %s", r.Header.Get("Origin"))
		w.WriteHeader(http.StatusForbidden)
		return
	}

	// Upgrade to WebSocket
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Failed to upgrade log stream connection: %v", err)
		return
	}
	defer conn.Close()

	log.Printf("Log stream connected for pod %s/%s, container %s", namespace, podName, container)

	// Create context for this stream
	ctx, cancel := context.WithCancel(r.Context())
	defer cancel()

	// Start log stream in goroutine
	logChan := make(chan string)
	errChan := make(chan error)

	go h.streamLogs(ctx, namespace, podName, container, previous, timestamps, logChan, errChan)

	// Send ping/pong keepalive
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	done := make(chan struct{})

	// Read messages (for close handling)
	go func() {
		defer close(done)
		for {
			_, _, err := conn.ReadMessage()
			if err != nil {
				if !websocket.IsCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
					log.Printf("Log stream WebSocket read error: %v", err)
				}
				cancel()
				return
			}
		}
	}()

	// Send logs to client
	for {
		select {
		case <-done:
			return
		case <-ctx.Done():
			return
		case line, ok := <-logChan:
			if !ok {
				// Stream ended normally
				sendJSON(conn, logStreamMessage{Type: "end", Data: ""})
				return
			}
			if err := sendJSON(conn, logStreamMessage{Type: "log", Data: line}); err != nil {
				log.Printf("Error sending log line: %v", err)
				return
			}
		case err, ok := <-errChan:
			if !ok {
				return
			}
			sendJSON(conn, logStreamMessage{Type: "error", Data: err.Error()})
			return
		case <-ticker.C:
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
				log.Printf("Log stream read error for %s/%s: %v", namespace, podName, err)
				return
			}

			// Send line (preserving newline for formatting)
			logChan <- line
		}
	}
}

func sendJSON(conn *websocket.Conn, v interface{}) error {
	data, err := json.Marshal(v)
	if err != nil {
		return err
	}
	return conn.WriteMessage(websocket.TextMessage, data)
}
