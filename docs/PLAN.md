# KUB - Kubernetes Dashboard with Visualizations

## Goal
Local web application for monitoring K8s clusters with attractive visualizations in a browser.

## Tech Stack

### Backend: Go
- **Why**: Native `client-go` (official K8s library), great WebSocket support, single binary, fast startup
- **Libraries**: client-go, gorilla/websocket, chi (router)

### Frontend: React + TypeScript + Tailwind
- **Why**: Rich charting ecosystem, shadcn/ui for components, good real-time support
- **Libraries**: Vite, shadcn/ui, Recharts (charts), Lucide (icons)

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Browser                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │           React Frontend (Vite)                  │   │
│  │  - Dashboard with CPU/RAM charts                │   │
│  │  - Pod list with real-time status               │   │
│  │  - Pod lifecycle visualization                  │   │
│  └──────────────────────┬──────────────────────────┘   │
└─────────────────────────┼───────────────────────────────┘
                          │ HTTP + WebSocket
┌─────────────────────────┼───────────────────────────────┐
│                    Go Backend                           │
│  ┌──────────────────────┴──────────────────────────┐   │
│  │  REST API          │  WebSocket Hub              │   │
│  │  /api/namespaces   │  /ws/pods (real-time)      │   │
│  │  /api/pods         │  /ws/events                │   │
│  │  /api/nodes        │  /ws/metrics               │   │
│  └──────────────────────┬──────────────────────────┘   │
│                         │                               │
│  ┌──────────────────────┴──────────────────────────┐   │
│  │              Kubernetes Client (client-go)       │   │
│  │  - Watch API for real-time updates              │   │
│  │  - Metrics Server for CPU/RAM                   │   │
│  │  - Kubeconfig from ~/.kube/config               │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   Kubernetes Cluster  │
              └───────────────────────┘
```

---

## MVP - Features

### 1. CPU/RAM Metrics (charts)
- Line charts for nodes and pods
- Gauge for current utilization
- Requirement: Metrics Server in cluster

### 2. Pod Status with Lifecycle
- Pod list with colored status (Running/Pending/Failed/Terminating)
- **Real-time animations** when:
  - Creating a new pod (green highlight, "entry" animation)
  - Deleting a pod (red highlight, "exit" animation)
  - Restarting (yellow transition animation)
- Timeline of recent state changes

### 3. Context/Namespace Switching
- Dropdown with available K8s contexts
- Filtering by namespace

---

## Project Structure

```
kub/
├── backend/
│   ├── main.go
│   ├── go.mod
│   ├── internal/
│   │   ├── api/
│   │   │   ├── handlers.go      # REST endpoints
│   │   │   └── websocket.go     # WebSocket hub
│   │   ├── k8s/
│   │   │   ├── client.go        # K8s client setup
│   │   │   ├── pods.go          # Pod operations + watch
│   │   │   ├── nodes.go         # Node operations
│   │   │   ├── deployments.go   # Deployment operations
│   │   │   ├── services.go      # Service operations
│   │   │   ├── configmaps.go    # ConfigMap operations
│   │   │   ├── metrics.go       # Metrics Server queries
│   │   │   └── events.go        # Events watch
│   │   └── models/
│   │       └── types.go         # Shared types
│   └── cmd/
│       └── kub/
│           └── main.go          # Entry point
│
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── ui/              # shadcn components
│   │   │   ├── Dashboard.tsx
│   │   │   ├── PodList.tsx      # List with animations
│   │   │   ├── PodCard.tsx      # Single pod
│   │   │   ├── NodeList.tsx     # Node list
│   │   │   ├── DeploymentList.tsx # Deployment list
│   │   │   ├── DeploymentCard.tsx # Single deployment
│   │   │   ├── ServiceList.tsx  # Service list
│   │   │   ├── ServiceCard.tsx  # Single service
│   │   │   ├── ConfigMapList.tsx # ConfigMap list
│   │   │   ├── ConfigMapCard.tsx # Single configmap
│   │   │   ├── MetricsChart.tsx # CPU/RAM charts
│   │   │   ├── GaugeChart.tsx   # Gauges
│   │   │   └── ContextSelector.tsx
│   │   ├── hooks/
│   │   │   ├── useWebSocket.ts  # WebSocket connection
│   │   │   ├── usePods.ts       # Pod state management
│   │   │   ├── useNodes.ts      # Node state management
│   │   │   ├── useDeployments.ts # Deployment state management
│   │   │   ├── useServices.ts   # Service state management
│   │   │   └── useConfigMaps.ts # ConfigMap state management
│   │   ├── lib/
│   │   │   └── utils.ts
│   │   └── types/
│   │       └── k8s.ts           # TypeScript types
│   └── index.html
│
├── Makefile                     # build, dev, run
└── README.md
```

---

## Implementation Plan

### Phase 0: Repository Initialization ✅
1. `git init` in `/Users/krzyzao/dev/kub` directory
2. Create `.gitignore` (node_modules, dist, Go binary, .env, etc.)
3. Copy this plan to `docs/PLAN.md` in the project
4. First commit

### Phase 1: Project Skeleton ✅
1. Initialize Go module + basic HTTP server
2. Initialize Vite + React + TypeScript + Tailwind
3. Configure shadcn/ui
4. Dev server proxy (Vite -> Go backend)

### Phase 2: K8s Connection ✅
1. K8s client with client-go (kubeconfig)
2. REST endpoint: GET /api/namespaces
3. REST endpoint: GET /api/pods?namespace=X
4. REST endpoint: GET /api/nodes

### Phase 3: Real-time (WebSocket) ✅
1. WebSocket hub in Go
2. Watch on pods with client-go
3. useWebSocket hook in React
4. Real-time pod list with lifecycle animations

### Phase 4: Metrics and Visualizations ✅
1. Metrics Server integration (metrics.k8s.io)
2. CPU/RAM charts with Recharts
3. Gauge components for current values

### Phase 5: Polish 🔄
1. Context/namespace selector ✅
2. Responsive layout ✅
3. Error handling + loading states ✅
4. Production build (embed frontend in Go binary)

---

## Backlog (future features)
- [ ] Cluster topology (connection graphs)
- [ ] Event timeline
- [ ] Pod logs (streaming)
- [ ] Exec into container (browser terminal)
- [x] Deployments, Services, ConfigMaps
- [ ] Dark mode

---

## Verification

1. **Startup**: `make dev` - starts backend + frontend
2. **Connection test**: Dashboard shows namespace list
3. **Real-time test**:
   ```bash
   kubectl run test-pod --image=nginx
   kubectl delete pod test-pod
   ```
   Watch animations in UI
4. **Metrics test**: CPU/RAM charts update

---

## System Requirements
- Go 1.21+
- Node.js 18+
- kubectl configured (~/.kube/config)
- Metrics Server in cluster (for CPU/RAM metrics)
