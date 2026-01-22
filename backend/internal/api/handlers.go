package api

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/krzyzao/kub/internal/k8s"
)

// Handler holds the HTTP handlers
type Handler struct {
	k8sClient *k8s.Client
}

// NewHandler creates a new handler
func NewHandler(k8sClient *k8s.Client) *Handler {
	return &Handler{k8sClient: k8sClient}
}

// GetNamespaces returns all namespaces
func (h *Handler) GetNamespaces(w http.ResponseWriter, r *http.Request) {
	namespaces, err := h.k8sClient.GetNamespaces(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, namespaces)
}

// GetPods returns pods in a namespace
func (h *Handler) GetPods(w http.ResponseWriter, r *http.Request) {
	namespace := r.URL.Query().Get("namespace")

	pods, err := h.k8sClient.GetPods(r.Context(), namespace)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, pods)
}

// GetPod returns a specific pod
func (h *Handler) GetPod(w http.ResponseWriter, r *http.Request) {
	namespace := chi.URLParam(r, "namespace")
	name := chi.URLParam(r, "name")

	pod, err := h.k8sClient.GetPod(r.Context(), namespace, name)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, pod)
}

// GetNodes returns all nodes with metrics
func (h *Handler) GetNodes(w http.ResponseWriter, r *http.Request) {
	nodes, err := h.k8sClient.GetNodes(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Fetch and merge metrics with nodes
	metrics, err := h.k8sClient.GetNodeMetrics(r.Context())
	if err == nil {
		metricsMap := make(map[string]struct {
			cpuUsage    int64
			memUsage    int64
			cpuPercent  float64
			memPercent  float64
		})
		for _, m := range metrics {
			metricsMap[m.Name] = struct {
				cpuUsage    int64
				memUsage    int64
				cpuPercent  float64
				memPercent  float64
			}{m.CPUUsage, m.MemoryUsage, m.CPUPercent, m.MemPercent}
		}
		for i := range nodes {
			if m, ok := metricsMap[nodes[i].Name]; ok {
				nodes[i].CPUUsage = m.cpuUsage
				nodes[i].MemoryUsage = m.memUsage
				nodes[i].CPUPercent = m.cpuPercent
				nodes[i].MemoryPercent = m.memPercent
			}
		}
	}

	respondJSON(w, nodes)
}

// GetNodeMetrics returns node metrics
func (h *Handler) GetNodeMetrics(w http.ResponseWriter, r *http.Request) {
	metrics, err := h.k8sClient.GetNodeMetrics(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, metrics)
}

// GetPodMetrics returns pod metrics
func (h *Handler) GetPodMetrics(w http.ResponseWriter, r *http.Request) {
	namespace := r.URL.Query().Get("namespace")

	metrics, err := h.k8sClient.GetPodMetrics(r.Context(), namespace)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, metrics)
}

// GetClusterSummary returns cluster summary
func (h *Handler) GetClusterSummary(w http.ResponseWriter, r *http.Request) {
	namespace := r.URL.Query().Get("namespace")
	summary, err := h.k8sClient.GetClusterSummary(r.Context(), namespace)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, summary)
}

// GetContexts returns available K8s contexts
func (h *Handler) GetContexts(w http.ResponseWriter, r *http.Request) {
	contexts, current := h.k8sClient.GetContexts()

	response := map[string]interface{}{
		"contexts": contexts,
		"current":  current,
	}

	respondJSON(w, response)
}

// SwitchContext switches to a different K8s context
func (h *Handler) SwitchContext(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Context string `json:"context"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if err := h.k8sClient.SwitchContext(req.Context); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	respondJSON(w, map[string]string{"status": "ok", "context": req.Context})
}

// GetDeployments returns deployments in a namespace
func (h *Handler) GetDeployments(w http.ResponseWriter, r *http.Request) {
	namespace := r.URL.Query().Get("namespace")

	deployments, err := h.k8sClient.GetDeployments(r.Context(), namespace)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, deployments)
}

// GetDeployment returns a specific deployment
func (h *Handler) GetDeployment(w http.ResponseWriter, r *http.Request) {
	namespace := chi.URLParam(r, "namespace")
	name := chi.URLParam(r, "name")

	deployment, err := h.k8sClient.GetDeployment(r.Context(), namespace, name)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, deployment)
}

// GetServices returns services in a namespace
func (h *Handler) GetServices(w http.ResponseWriter, r *http.Request) {
	namespace := r.URL.Query().Get("namespace")

	services, err := h.k8sClient.GetServices(r.Context(), namespace)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, services)
}

// GetService returns a specific service
func (h *Handler) GetService(w http.ResponseWriter, r *http.Request) {
	namespace := chi.URLParam(r, "namespace")
	name := chi.URLParam(r, "name")

	service, err := h.k8sClient.GetService(r.Context(), namespace, name)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, service)
}

// GetConfigMaps returns configmaps in a namespace
func (h *Handler) GetConfigMaps(w http.ResponseWriter, r *http.Request) {
	namespace := r.URL.Query().Get("namespace")

	configmaps, err := h.k8sClient.GetConfigMaps(r.Context(), namespace)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, configmaps)
}

// GetConfigMap returns a specific configmap
func (h *Handler) GetConfigMap(w http.ResponseWriter, r *http.Request) {
	namespace := chi.URLParam(r, "namespace")
	name := chi.URLParam(r, "name")

	configmap, err := h.k8sClient.GetConfigMap(r.Context(), namespace, name)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, configmap)
}

func respondJSON(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}
