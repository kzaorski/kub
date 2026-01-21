package api

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/krzyzao/kub/internal/k8s"
	"github.com/krzyzao/kub/internal/models"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/watch"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins in development
	},
}

// Hub manages WebSocket connections and broadcasts
type Hub struct {
	k8sClient  *k8s.Client
	clients    map[*websocket.Conn]bool
	broadcast  chan []byte
	register   chan *websocket.Conn
	unregister chan *websocket.Conn
	mu         sync.RWMutex
}

// NewHub creates a new WebSocket hub
func NewHub(k8sClient *k8s.Client) *Hub {
	return &Hub{
		k8sClient:  k8sClient,
		clients:    make(map[*websocket.Conn]bool),
		broadcast:  make(chan []byte, 256),
		register:   make(chan *websocket.Conn),
		unregister: make(chan *websocket.Conn),
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
			log.Printf("Client connected. Total clients: %d", len(h.clients))
		case conn := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[conn]; ok {
				delete(h.clients, conn)
				conn.Close()
			}
			h.mu.Unlock()
			log.Printf("Client disconnected. Total clients: %d", len(h.clients))
		case message := <-h.broadcast:
			h.mu.RLock()
			for conn := range h.clients {
				err := conn.WriteMessage(websocket.TextMessage, message)
				if err != nil {
					log.Printf("Error sending message: %v", err)
					conn.Close()
					delete(h.clients, conn)
				}
			}
			h.mu.RUnlock()
		}
	}
}

// StartPodWatcher starts watching pods and broadcasting changes
func (h *Hub) StartPodWatcher(ctx context.Context, namespace string) {
	for {
		select {
		case <-ctx.Done():
			return
		default:
			watcher, err := h.k8sClient.WatchPods(ctx, namespace)
			if err != nil {
				log.Printf("Failed to start pod watcher: %v", err)
				time.Sleep(5 * time.Second)
				continue
			}

			h.handlePodWatch(ctx, watcher)
		}
	}
}

func (h *Hub) handlePodWatch(ctx context.Context, watcher watch.Interface) {
	defer watcher.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case event, ok := <-watcher.ResultChan():
			if !ok {
				log.Println("Pod watcher channel closed, reconnecting...")
				return
			}

			pod, ok := event.Object.(*corev1.Pod)
			if !ok {
				continue
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
				log.Printf("Failed to marshal pod event: %v", err)
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

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			h.broadcastMetrics(ctx, namespace)
		}
	}
}

func (h *Hub) broadcastMetrics(ctx context.Context, namespace string) {
	nodeMetrics, err := h.k8sClient.GetNodeMetrics(ctx)
	if err != nil {
		log.Printf("Failed to get node metrics: %v", err)
		nodeMetrics = []models.NodeMetrics{}
	}

	podMetrics, err := h.k8sClient.GetPodMetrics(ctx, namespace)
	if err != nil {
		log.Printf("Failed to get pod metrics: %v", err)
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
		log.Printf("Failed to marshal metrics: %v", err)
		return
	}

	h.broadcast <- data
}

// HandleWebSocket handles WebSocket connections
func (h *Hub) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Failed to upgrade connection: %v", err)
		return
	}

	h.register <- conn

	// Send initial data
	go h.sendInitialData(conn, r.URL.Query().Get("namespace"))

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

func (h *Hub) sendInitialData(conn *websocket.Conn, namespace string) {
	ctx := context.Background()

	// Send pods
	pods, err := h.k8sClient.GetPods(ctx, namespace)
	if err != nil {
		log.Printf("Failed to get initial pods: %v", err)
	} else {
		data, _ := json.Marshal(map[string]interface{}{
			"type": "pods",
			"data": pods,
		})
		conn.WriteMessage(websocket.TextMessage, data)
	}

	// Send cluster summary
	summary, err := h.k8sClient.GetClusterSummary(ctx)
	if err != nil {
		log.Printf("Failed to get cluster summary: %v", err)
	} else {
		data, _ := json.Marshal(map[string]interface{}{
			"type": "summary",
			"data": summary,
		})
		conn.WriteMessage(websocket.TextMessage, data)
	}

	// Send initial metrics
	h.broadcastMetrics(ctx, namespace)
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
				log.Printf("WebSocket error: %v", err)
			}
			break
		}

		// Handle incoming messages (e.g., namespace changes)
		var msg map[string]string
		if err := json.Unmarshal(message, &msg); err == nil {
			if msg["type"] == "subscribe" {
				// Client wants to subscribe to a different namespace
				log.Printf("Client subscribed to namespace: %s", msg["namespace"])
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
