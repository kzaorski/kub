# Contributing to KUB

Development guide for the KUB Kubernetes Dashboard.

## Prerequisites

| Requirement | Minimum Version | Check Command |
|-------------|-----------------|---------------|
| Go | 1.25+ | `go version` |
| Node.js | 20+ | `node -v` |
| kubectl | - | `kubectl version` |
| Kubernetes cluster | - | `kubectl cluster-info` |
| Metrics Server | - | `kubectl top nodes` |

## Environment Setup

### 1. Clone and Install Dependencies

```bash
git clone <repo-url>
cd kub

# Install all dependencies (Go modules + npm packages)
make install
```

Or manually:

```bash
# Backend
cd backend && go mod tidy

# Frontend
cd frontend && npm install
```

### 2. Configure Kubernetes Access

Ensure you have a valid kubeconfig at `~/.kube/config` (Linux/macOS) or `%USERPROFILE%\.kube\config` (Windows).

```bash
kubectl cluster-info
kubectl get nodes
```

### 3. Install Metrics Server (for CPU/RAM metrics)

```bash
# Standard Kubernetes
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Minikube
minikube addons enable metrics-server
```

## Development Workflow

### Starting Development Servers

**Option A: Two terminals (recommended)**

```bash
# Terminal 1 - Backend (Go)
cd backend && go run ./cmd/kub

# Terminal 2 - Frontend (React)
cd frontend && npm run dev
```

**Option B: Single command**

```bash
make dev
```

**URLs:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8080

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server listen port | `8080` |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | `http://localhost:5173,http://localhost:8080` |
| `KUBECONFIG` | Path to kubeconfig file | `~/.kube/config` |

## Available Scripts

### Makefile Targets (Root)

| Command | Description |
|---------|-------------|
| `make install` | Install Go modules and npm packages |
| `make build` | Build production binaries (frontend + backend) |
| `make build-backend` | Build Go binary only |
| `make build-frontend` | Build frontend and copy to backend/cmd/kub/static |
| `make dev` | Start both backend and frontend in development mode |
| `make dev-backend` | Start Go backend only |
| `make dev-frontend` | Start Vite frontend only |
| `make run` | Build and run production binary |
| `make clean` | Remove build artifacts (bin/, dist/, node_modules/) |
| `make fmt` | Format Go code |

### Frontend Scripts (frontend/package.json)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite development server |
| `npm run build` | TypeScript check + Vite production build |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview production build locally |

## Testing

### Manual Testing

1. Start the application in dev mode
2. Open http://localhost:5173
3. Verify real-time updates:

```bash
# Create a test pod
kubectl run test-pod --image=nginx

# Watch the pod appear in UI with animation

# Delete the pod
kubectl delete pod test-pod

# Watch the pod disappear with animation
```

### Verify Features

- [ ] Namespace selector works
- [ ] Context switching works
- [ ] CPU/RAM metrics display
- [ ] Real-time WebSocket updates
- [ ] Pod/Deployment/Service/ConfigMap cards expand
- [ ] Rate limiting (test with rapid requests)
- [ ] Paginated pods endpoint works

## Code Style

### Go (Backend)

- Format with `make fmt` before committing
- Follow standard Go conventions

### TypeScript (Frontend)

- Run `npm run lint` before committing
- Use TypeScript strict mode
- React functional components with hooks

## Project Structure

```
kub/
├── backend/
│   ├── cmd/kub/          # Entry point, router setup
│   └── internal/
│       ├── api/          # REST & WebSocket handlers, rate limiting
│       ├── k8s/          # Kubernetes client operations
│       └── models/       # Shared types
├── frontend/
│   └── src/
│       ├── components/   # React components (card-based UI)
│       ├── hooks/        # Custom hooks with AbortController
│       ├── lib/          # Utilities (api.ts, status helpers)
│       └── types/        # TypeScript types
├── scripts/              # Build scripts
├── docs/                 # Documentation
└── Makefile              # Build automation
```

## Building for Production

### macOS / Linux

```bash
make build
./bin/kub
```

### Windows (PowerShell)

```powershell
.\scripts\build.ps1
.\bin\kub.exe
```

The production build embeds the frontend into the Go binary.

## Troubleshooting

### "go: go.mod requires go >= 1.25"

Update Go from https://go.dev/dl/

### WebSocket connection error

Ensure backend is running on port 8080 before starting frontend.

### No metrics displayed

Metrics Server is not installed in the cluster. See setup instructions above.

### npm install fails

Try clearing npm cache:

```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```
