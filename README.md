# KUB - Kubernetes Dashboard

A local web application for monitoring Kubernetes clusters with attractive visualizations in the browser.

## Features

- **Real-time Monitoring** - Live updates via WebSocket with lifecycle animations
- **Card-based UI** - Expandable cards for detailed resource information
- **Resource Views** - Pods, Deployments, Services, ConfigMaps, Nodes
- **Cluster Metrics** - CPU/RAM gauges and historical charts
- **Namespace Filtering** - Switch between namespaces easily
- **Context Switching** - Support for multiple K8s contexts
- **Responsive Design** - Works on desktop and tablet
- **Smart Reconnection** - Exponential backoff for WebSocket resilience

## Tech Stack

### Backend (Go)
- `client-go` - Official Kubernetes client library
- `chi` - Lightweight HTTP router with security middleware
- `gorilla/websocket` - WebSocket support with origin checking
- `metrics-client` - Metrics Server integration
- Input validation with Kubernetes name regex patterns
- Context timeout for WebSocket operations

### Frontend (React + TypeScript)
- `Vite` - Fast build tool
- `Tailwind CSS v4` - Utility-first CSS
- `Recharts` - Charts and visualizations
- `Lucide` - Icon library
- `Radix UI` - Accessible UI primitives
- `TanStack Table` - Data table with pagination and sorting
- `React.memo` - Performance optimization for components
- `AbortController` - Request cancellation for memory leak prevention

## Requirements

- **Go 1.25+** (check with `go version`)
- **Node.js 20+** (check with `node -v`)
- **kubectl configured** (`~/.kube/config` or `%USERPROFILE%\.kube\config`)
- **Metrics Server** in cluster (for CPU/RAM metrics)

## Quick Start

### 1. Install dependencies (required after cloning!)

```bash
# Backend (Go modules)
cd backend && go mod tidy

# Frontend (npm packages)
cd frontend && npm install
```

Or use Makefile:
```bash
make install
```

### 2. Run the application

**Option A: Two terminals (recommended)**

```bash
# Terminal 1 - Backend
cd backend && go run ./cmd/kub

# Terminal 2 - Frontend
cd frontend && npm run dev
```

**Option B: Single command**
```bash
make dev
```

**URLs:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8080

## Production Build

### macOS / Linux

```bash
# Build everything (frontend embedded in Go binary)
make build

# Run production build
./bin/kub
```

### Windows (PowerShell)

```powershell
# Build everything
.\scripts\build.ps1

# Run production build
.\bin\kub.exe
```

## Project Structure

```
kub/
├── backend/
│   ├── cmd/kub/          # Entry point with security middleware
│   └── internal/
│       ├── api/          # REST & WebSocket handlers
│       ├── k8s/          # Kubernetes client
│       └── models/       # Shared types
├── frontend/
│   └── src/
│       ├── components/   # React components (card-based UI)
│       ├── hooks/        # Custom hooks with AbortController
│       ├── lib/          # Utilities (api.ts, status helpers)
│       └── types/        # TypeScript types
├── Makefile
└── README.md
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/namespaces` | List all namespaces |
| GET | `/api/pods?namespace=X` | List pods (optional namespace filter) |
| GET | `/api/pods/{namespace}/{name}` | Get single pod details |
| GET | `/api/nodes` | List all nodes |
| GET | `/api/metrics/nodes` | Node CPU/RAM metrics |
| GET | `/api/metrics/pods?namespace=X` | Pod CPU/RAM metrics |
| GET | `/api/summary?namespace=X` | Cluster summary |
| GET | `/api/contexts` | List K8s contexts |
| POST | `/api/contexts` | Switch context |
| GET | `/api/deployments?namespace=X` | List deployments |
| GET | `/api/deployments/{namespace}/{name}` | Get single deployment |
| GET | `/api/services?namespace=X` | List services |
| GET | `/api/services/{namespace}/{name}` | Get single service |
| GET | `/api/configmaps?namespace=X` | List configmaps |
| GET | `/api/configmaps/{namespace}/{name}` | Get single configmap |
| WS | `/ws` | Real-time updates |

## Security & Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ALLOWED_ORIGINS` | Comma-separated list of allowed CORS origins | `http://localhost:5173,http://localhost:8080` |

### Security Features

- **Input Validation**: Kubernetes name regex validation for all namespace/name parameters
- **Security Headers**: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection
- **Origin Checking**: WebSocket connections validate origin header
- **Context Timeout**: 30s timeout for WebSocket initial data fetch
- **Generic Error Messages**: Detailed errors logged, generic messages returned to client

## Troubleshooting

### "go: go.mod requires go >= 1.25"
Install a newer version of Go from https://go.dev/dl/

### WebSocket connection error
Make sure the backend is running on port 8080 before starting the frontend.

### No metrics displayed
Install Metrics Server in your cluster:
```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

For minikube:
```bash
minikube addons enable metrics-server
```

### kubectl not configured
Ensure you have a valid kubeconfig:
```bash
kubectl cluster-info
```

## Testing

1. Start backend: `cd backend && go run ./cmd/kub`
2. Start frontend: `cd frontend && npm run dev`
3. Open http://localhost:5173
4. Test real-time updates:
   ```bash
   kubectl run test-pod --image=nginx
   kubectl delete pod test-pod
   ```
5. Observe pod animations in the UI

## License

MIT
