# KUB - Kubernetes Dashboard

A local web application for monitoring Kubernetes clusters with attractive visualizations, similar to k9s but in the browser.

## Features

- **Real-time Pod Monitoring** - Live updates via WebSocket with lifecycle animations
- **Cluster Metrics** - CPU/RAM gauges and historical charts
- **Namespace Filtering** - Switch between namespaces easily
- **Context Switching** - Support for multiple K8s contexts
- **Responsive Design** - Works on desktop and tablet

## Tech Stack

### Backend (Go)
- `client-go` - Official Kubernetes client library
- `chi` - Lightweight HTTP router
- `gorilla/websocket` - WebSocket support
- `metrics-client` - Metrics Server integration

### Frontend (React + TypeScript)
- `Vite` - Fast build tool
- `Tailwind CSS v4` - Utility-first CSS
- `Recharts` - Charts and visualizations
- `Lucide` - Icon library
- `Radix UI` - Accessible UI primitives

## Requirements

- Go 1.21+
- Node.js 18+
- kubectl configured (`~/.kube/config` or `%USERPROFILE%\.kube\config`)
- Metrics Server in cluster (for CPU/RAM metrics)

## Quick Start

### macOS / Linux

```bash
# Install dependencies
make install

# Run in development mode (backend + frontend)
make dev
```

### Windows (PowerShell)

```powershell
# Install dependencies
.\scripts\install.ps1

# Run in development mode
.\scripts\dev.ps1
```

- Backend: http://localhost:8080
- Frontend: http://localhost:5173

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
│   ├── cmd/kub/          # Entry point
│   └── internal/
│       ├── api/          # REST & WebSocket handlers
│       ├── k8s/          # Kubernetes client
│       └── models/       # Shared types
├── frontend/
│   └── src/
│       ├── components/   # React components
│       ├── hooks/        # Custom hooks
│       ├── lib/          # Utilities
│       └── types/        # TypeScript types
├── Makefile
└── docs/PLAN.md
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/namespaces` | List all namespaces |
| GET | `/api/pods?namespace=X` | List pods (optional namespace filter) |
| GET | `/api/nodes` | List all nodes |
| GET | `/api/metrics/nodes` | Node CPU/RAM metrics |
| GET | `/api/metrics/pods` | Pod CPU/RAM metrics |
| GET | `/api/summary` | Cluster summary |
| GET | `/api/contexts` | List K8s contexts |
| POST | `/api/contexts` | Switch context |
| WS | `/ws` | Real-time updates |

## Testing

1. Start the application: `make dev`
2. Open http://localhost:5173
3. Test real-time updates:
   ```bash
   kubectl run test-pod --image=nginx
   kubectl delete pod test-pod
   ```
4. Observe pod animations in the UI

## License

MIT
