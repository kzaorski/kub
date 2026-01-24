# KUB Runbook

Operations guide for deploying and maintaining the KUB Kubernetes Dashboard.

## Deployment Procedures

### Local Deployment

1. **Build the production binary**

```bash
make build
```

2. **Run the application**

```bash
./bin/kub
```

3. **Access the dashboard**

Open http://localhost:8080 in your browser.

### Windows Deployment

```powershell
.\scripts\build.ps1
.\bin\kub.exe
```

### Docker Deployment (Future)

Not yet implemented. The application currently runs as a local binary.

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ALLOWED_ORIGINS` | Comma-separated list of allowed CORS origins | `http://localhost:5173,http://localhost:8080` |

### Kubernetes Configuration

The application uses the standard kubeconfig file:
- **Linux/macOS**: `~/.kube/config`
- **Windows**: `%USERPROFILE%\.kube\config`

Ensure the kubeconfig has access to the target cluster.

## Monitoring and Alerts

### Health Checks

| Check | How to Verify |
|-------|---------------|
| Backend running | `curl http://localhost:8080/api/namespaces` |
| WebSocket working | Open UI, check for real-time updates |
| K8s connection | UI shows namespaces and pods |
| Metrics working | CPU/RAM gauges display data |

### Log Locations

The application logs to stdout/stderr. No persistent log files by default.

To capture logs:

```bash
./bin/kub 2>&1 | tee kub.log
```

### Key Metrics to Watch

| Metric | Normal Range | Alert Threshold |
|--------|--------------|-----------------|
| WebSocket connections | 0-10 | >50 |
| API response time | <100ms | >500ms |
| Memory usage | <100MB | >500MB |

## Common Issues and Fixes

### Issue: "connection refused" on startup

**Cause**: Kubernetes cluster not accessible.

**Fix**:
```bash
# Verify kubectl works
kubectl cluster-info

# Check kubeconfig
kubectl config view
```

### Issue: No metrics displayed

**Cause**: Metrics Server not installed in cluster.

**Fix**:
```bash
# Standard Kubernetes
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Minikube
minikube addons enable metrics-server

# Verify
kubectl top nodes
```

### Issue: WebSocket disconnections

**Cause**: Network instability or backend crash.

**Fix**:
1. Check backend logs for errors
2. The frontend has automatic reconnection with exponential backoff
3. If persistent, restart the backend

### Issue: CORS errors in browser console

**Cause**: Frontend running on different origin than configured.

**Fix**:
```bash
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080 ./bin/kub
```

### Issue: "go.mod requires go >= 1.25"

**Cause**: Outdated Go version.

**Fix**: Update Go from https://go.dev/dl/

### Issue: Frontend build fails

**Cause**: Node.js version too old or corrupted node_modules.

**Fix**:
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

## Rollback Procedures

### Scenario: Bad deployment

Since KUB runs as a local binary, rollback is straightforward:

1. **Stop the running instance** (Ctrl+C)

2. **Restore previous binary**
```bash
# If you kept a backup
cp bin/kub.backup bin/kub

# Or rebuild from a known-good commit
git checkout <good-commit>
make build
```

3. **Restart**
```bash
./bin/kub
```

### Scenario: Configuration issue

1. Reset environment variables to defaults
2. Verify kubeconfig is correct: `kubectl cluster-info`
3. Restart the application

## Security Considerations

### Features Implemented

- **Input Validation**: Kubernetes name regex validation on all parameters
- **Security Headers**: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection
- **Origin Checking**: WebSocket connections validate origin header
- **Context Timeout**: 30s timeout for WebSocket initial data fetch
- **Generic Errors**: Detailed errors logged, generic messages to client

### Access Control

- KUB inherits permissions from the kubeconfig user
- No additional authentication layer
- Run only on trusted networks

### Recommendations

1. Do not expose KUB to the public internet
2. Use a kubeconfig with minimal required permissions
3. Run behind a reverse proxy with authentication if sharing access

## Maintenance Tasks

### Regular Tasks

| Task | Frequency | Command |
|------|-----------|---------|
| Update dependencies | Monthly | `make install` |
| Rebuild binary | After updates | `make build` |
| Check Go version | Quarterly | `go version` |
| Check Node.js version | Quarterly | `node -v` |

### Cleanup

```bash
# Remove all build artifacts
make clean

# Full reinstall
make clean && make install && make build
```

## Support

For issues:
1. Check this runbook first
2. Review backend logs
3. Check browser console for frontend errors
4. Verify Kubernetes cluster health with kubectl
