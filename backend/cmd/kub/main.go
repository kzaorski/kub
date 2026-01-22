package main

import (
	"context"
	"embed"
	"io/fs"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/krzyzao/kub/internal/api"
	"github.com/krzyzao/kub/internal/k8s"
)

//go:embed static/*
var staticFiles embed.FS

func main() {
	// Create K8s client
	k8sClient, err := k8s.NewClient()
	if err != nil {
		log.Fatalf("Failed to create K8s client: %v", err)
	}

	// Create handlers
	handler := api.NewHandler(k8sClient)
	hub := api.NewHub(k8sClient)

	// Create router
	r := chi.NewRouter()

	// Security headers middleware
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("X-Content-Type-Options", "nosniff")
			w.Header().Set("X-Frame-Options", "DENY")
			w.Header().Set("X-XSS-Protection", "1; mode=block")
			next.ServeHTTP(w, r)
		})
	})

	// Middleware
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Compress(5))
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   api.GetAllowedOrigins(),
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// API routes
	r.Route("/api", func(r chi.Router) {
		r.Get("/namespaces", handler.GetNamespaces)
		r.Get("/pods", handler.GetPods)
		r.Get("/pods/{namespace}/{name}", handler.GetPod)
		r.Get("/nodes", handler.GetNodes)
		r.Get("/metrics/nodes", handler.GetNodeMetrics)
		r.Get("/metrics/pods", handler.GetPodMetrics)
		r.Get("/summary", handler.GetClusterSummary)
		r.Get("/contexts", handler.GetContexts)
		r.Post("/contexts", handler.SwitchContext)
		r.Get("/deployments", handler.GetDeployments)
		r.Get("/deployments/{namespace}/{name}", handler.GetDeployment)
		r.Get("/services", handler.GetServices)
		r.Get("/services/{namespace}/{name}", handler.GetService)
		r.Get("/configmaps", handler.GetConfigMaps)
		r.Get("/configmaps/{namespace}/{name}", handler.GetConfigMap)
	})

	// WebSocket
	r.Get("/ws", hub.HandleWebSocket)

	// Static files (embedded frontend)
	staticFS, err := fs.Sub(staticFiles, "static")
	if err != nil {
		log.Printf("Static files not embedded, serving from filesystem")
		r.Handle("/*", http.FileServer(http.Dir("./static")))
	} else {
		r.Handle("/*", http.FileServer(http.FS(staticFS)))
	}

	// Create context for graceful shutdown
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Start WebSocket hub
	go hub.Run(ctx)

	// Start pod watcher
	go hub.StartPodWatcher(ctx, "")

	// Start metrics watcher (every 5 seconds)
	go hub.StartMetricsWatcher(ctx, "", 5*time.Second)

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	server := &http.Server{
		Addr:    ":" + port,
		Handler: r,
	}

	// Graceful shutdown
	go func() {
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
		<-sigChan

		log.Println("Shutting down server...")
		cancel()

		shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer shutdownCancel()

		if err := server.Shutdown(shutdownCtx); err != nil {
			log.Printf("Server shutdown error: %v", err)
		}
	}()

	log.Printf("Starting KUB server on http://localhost:%s", port)
	if err := server.ListenAndServe(); err != http.ErrServerClosed {
		log.Fatalf("Server error: %v", err)
	}
}
