# OpenTelemetry Observability Guide for KUB

This guide explains how to use OpenTelemetry instrumentation in KUB for debugging, monitoring, and operational visibility.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Quick Start](#quick-start)
3. [Key Traces for Debugging](#key-traces-for-debugging)
4. [Metrics Reference](#metrics-reference)
5. [Query Examples](#query-examples)
6. [Common Issues and Diagnosis](#common-issues-and-diagnosis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         KUB Backend                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│  │ HTTP Handler │───▶│  K8s Client  │───▶│ K8s API      │     │
│  │ (chi router) │    │  (client-go) │    │ Server       │     │
│  └──────────────┘    └──────────────┘    └──────────────┘     │
│         │                   │                                  │
│         │                   │                                  │
│         ▼                   ▼                                  │
│  ┌──────────────┐    ┌──────────────┐                         │
│  │   WebSocket  │    │    Watchers  │                         │
│  │     Hub      │    │  (pod/metrics)│                        │
│  └──────────────┘    └──────────────┘                         │
│         │                                                          │
│         ▼                                                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              OpenTelemetry SDK                            │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │   │
│  │  │ TracerProvider│ │ MeterProvider│ │ Logger       │   │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                             │                                    │
│                             ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              OTLP/gRPC Exporter                          │   │
│  │         (to Jaeger or OTEL Collector)                   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Instrumentation Components

1. **HTTP Handlers** (Stage 2)
   - Automatic tracing via `otelchi` middleware
   - All 25+ REST endpoints instrumented
   - Span name pattern: `{METHOD} {PATH}`

2. **Kubernetes Client** (Stage 3)
   - All K8s API calls traced
   - Span name pattern: `k8s.{resource}.{operation}`
   - Metrics for duration, count, and errors

3. **WebSocket Connections** (Stage 4)
   - Connection lifecycle tracing
   - Message type tracking
   - Active connection monitoring

4. **Background Watchers** (Stage 5)
   - Pod watcher session spans
   - Metrics watcher cycle spans
   - Event and error counting

5. **Structured Logging** (Stage 7)
   - Automatic trace ID correlation
   - Contextual fields for all logs

---

## Quick Start

### Local Development Setup

1. **Start Jaeger (all-in-one):**
```bash
docker run -d \
  --name jaeger \
  -p 4317:4317 \
  -p 16686:16686 \
  jaegertracing/all-in-one:latest
```

2. **Configure KUB with OTel:**
```bash
export OTEL_EXPORTER_OTLP_ENDPOINT=localhost:4317
export OTEL_TRACES_SAMPLE_RATIO=1.0
export OTEL_ENVIRONMENT=development
```

3. **Start KUB:**
```bash
cd backend && go run ./cmd/kub
```

4. **Generate traces by making requests:**
```bash
# Get pods
curl http://localhost:8080/api/pods?namespace=default

# Get nodes
curl http://localhost:8080/api/nodes

# Connect WebSocket (use a WebSocket client or browser)
ws://localhost:8080/ws?namespace=default
```

5. **View traces in Jaeger UI:**
   - Open http://localhost:16686
   - Service: `kub`
   - Operations: `GET /api/pods`, `k8s.pods.list`, etc.

### Kubernetes Deployment

Add to your deployment YAML:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kub
spec:
  template:
    spec:
      containers:
      - name: kub
        env:
        - name: OTEL_EXPORTER_OTLP_ENDPOINT
          value: otel-collector.monitoring.svc.cluster.local:4317
        - name: OTEL_TRACES_SAMPLE_RATIO
          value: "0.1"  # 10% sampling for production
        - name: OTEL_ENVIRONMENT
          value: production
        - name: OTEL_SERVICE_NAME
          value: kub
```

---

## Key Traces for Debugging

### Trace Hierarchy

A typical request trace shows the complete request flow:

```
GET /api/pods (HTTP Handler)
├── k8s.pods.list (K8s API call)
│   └── [K8s API Server latency]
├── k8s.metrics.pods.list (Metrics fetch)
│   └── [K8s Metrics Server latency]
└── ws.fetch_pods (if WebSocket initial data)
    └── [Data transformation latency]
```

### Common Trace Patterns

#### 1. Slow HTTP Request
**Symptom**: High latency on `GET /api/pods`

**Diagnosis**:
1. Check span durations in trace
2. If `k8s.pods.list` dominates: K8s API Server issue
3. If `k8s.metrics.pods.list` dominates: Metrics Server issue
4. If both are fast: Check KUB transformation logic

#### 2. WebSocket Connection Issues
**Symptom**: Failed `ws.upgrade` span

**Diagnosis**:
1. Check span error attribute
2. Verify authentication/authorization
3. Check WebSocket upgrade headers
4. Review `ws.connections.active` metric trend

#### 3. Pod Watcher Reconnections
**Symptom**: High `watcher.pod.reconnects` counter

**Diagnosis**:
1. Look for `watcher.pod.session` spans with short durations
2. Check `reconnect.count` attribute
3. Review K8s API connectivity
4. Check network policies affecting watch connections

#### 4. Metrics Fetch Failures
**Symptom**: High `watcher.metrics.errors` counter

**Diagnosis**:
1. Find `watcher.metrics.fetch` spans with errors
2. Check `metrics.resource` attribute (nodes vs pods)
3. Verify Metrics Server is running
4. Check resource quota limits

---

## Metrics Reference

### HTTP Metrics

| Metric | Type | Unit | Description |
|--------|------|------|-------------|
| `http.server.duration` | Histogram | ms | HTTP request latency |
| `http.server.request.count` | Counter | {request} | Total HTTP requests |
| `http.server.response.count` | Counter | {response} | Total HTTP responses |

**Dimensions**: `http.method`, `http.route`, `http.status_code`

**Useful queries**:
- Error rate: `rate(http_server_response_count{http_status_code=~"5.."}[5m])`
- P95 latency: `histogram_quantile(0.95, rate(http_server_duration_bucket[5m]))`

### WebSocket Metrics

| Metric | Type | Unit | Description |
|--------|------|------|-------------|
| `ws.connections.active` | UpDownCounter | {connection} | Current active connections |
| `ws.messages.sent` | Counter | {message} | Total messages sent |
| `ws.initial_data.latency` | Histogram | ms | Initial data fetch time |
| `ws.broadcast.errors` | Counter | {error} | Failed broadcast sends |

**Dimensions**: `ws.endpoint`, `ws.message_type`

**Useful queries**:
- Active connections: `ws_connections_active`
- Message rate by type: `rate(ws_messages_sent[5m])`
- P95 initial data latency: `histogram_quantile(0.95, rate(ws_initial_data_latency_bucket[5m]))`

### Kubernetes Client Metrics

| Metric | Type | Unit | Description |
|--------|------|------|-------------|
| `k8s.operation.duration` | Histogram | ms | K8s API call duration |
| `k8s.operation.count` | Counter | {operation} | Total K8s operations |
| `k8s.errors` | Counter | {error} | K8s API errors |

**Dimensions**: `k8s.operation`, `k8s.resource_type`, `k8s.namespace`, `k8s.error_type`

**Useful queries**:
- Error rate: `rate(k8s_errors[5m]) / rate(k8s_operation_count[5m])`
- Operation latency by type: `histogram_quantile(0.95, rate(k8s_operation_duration_bucket[5m]))`

### Watcher Metrics

| Metric | Type | Unit | Description |
|--------|------|------|-------------|
| `watcher.pod.events` | Counter | {event} | Pod watch events |
| `watcher.pod.reconnects` | Counter | {reconnection} | Pod watcher reconnections |
| `watcher.metrics.duration` | Histogram | ms | Metrics fetch duration |
| `watcher.metrics.errors` | Counter | {error} | Metrics fetch errors |
| `watcher.metrics.fetch.count` | Counter | {fetch} | Total metrics fetches |

**Dimensions**: `k8s.namespace`, `event.type`, `metrics.resource`, `error.type`

**Useful queries**:
- Reconnection rate: `rate(watcher_pod_reconnects[5m])`
- Event rate by type: `rate(watcher_pod_events[5m])`
- Metrics fetch error rate: `rate(watcher_metrics_errors[5m]) / rate(watcher_metrics_fetch_count[5m])`

### Log Streaming Metrics

| Metric | Type | Unit | Description |
|--------|------|------|-------------|
| `logs.lines.streamed` | Counter | {line} | Log lines sent |
| `logs.stream.errors` | Counter | {error} | Stream errors |

**Dimensions**: `k8s.namespace`, `k8s.pod_name`

**Useful queries**:
- Log line rate: `rate(logs_lines_streamed[5m])`
- Stream error rate: `rate(logs_stream_errors[5m])`

---

## Query Examples

### Jaeger UI Queries

**Find slow HTTP requests:**
1. Go to http://localhost:16686
2. Service: `kub`
3. Operation: `GET /api/pods`
4. Look for traces with duration > 1000ms
5. Click trace to see span breakdown

**Find K8s API errors:**
1. Search by tag: `error=true`
2. Service: `kub`
3. Look for spans with `k8s.` prefix
4. Check `k8s.error_type` attribute

**Find WebSocket issues:**
1. Service: `kub`
2. Operation: `ws.upgrade` or `ws.logs.stream`
3. Look for error spans
4. Check connection and pod attributes

### Prometheus Queries (if using Prometheus)

**High error rate (>5%):**
```promql
rate(k8s_errors[5m]) / rate(k8s_operation_count[5m]) > 0.05
```

**Slow K8s operations (P95 > 500ms):**
```promql
histogram_quantile(0.95, rate(k8s_operation_duration_bucket{k8s_operation="list"}[5m])) > 500
```

**Excessive pod watcher reconnections:**
```promql
rate(watcher_pod_reconnects[5m]) > 0.1
```

**WebSocket message error rate:**
```promql
rate(ws_broadcast_errors[5m]) / rate(ws_messages_sent[5m])
```

---

## Common Issues and Diagnosis

### Issue 1: No Traces Appearing in Jaeger

**Symptoms:**
- Jaeger UI shows no traces for service `kub`
- No errors in KUB logs

**Diagnosis Steps:**
1. Verify OTel is enabled:
   ```bash
   # Check KUB startup logs for:
   # "OpenTelemetry endpoint: localhost:4317"
   # "Sampling ratio: 1.0"
   ```

2. Verify exporter connectivity:
   ```bash
   telnet localhost 4317
   # Should connect successfully
   ```

3. Check environment variables:
   ```bash
   echo $OTEL_EXPORTER_OTLP_ENDPOINT  # Should be set
   echo $OTEL_TRACES_SAMPLE_RATIO      # Should be > 0
   echo $OTEL_SDK_DISABLED             # Should be unset or "false"
   ```

4. Enable debug logging:
   ```bash
   export OTEL_LOG_LEVEL=debug
   # Restart KUB and look for OTel debug logs
   ```

**Solution:**
- Ensure Jaeger is running: `docker ps | grep jaeger`
- Check OTel endpoint matches Jaeger port
- Verify sampling ratio > 0
- Check firewall rules

### Issue 2: High Memory Usage

**Symptoms:**
- KUB process memory steadily increasing
- OOM kills in Kubernetes

**Diagnosis Steps:**
1. Check sampling ratio:
   ```bash
   # 100% sampling generates many spans
   echo $OTEL_TRACES_SAMPLE_RATIO
   ```

2. Monitor span buffer size:
   - Default batch size: 256 spans
   - Batch timeout: 30 seconds

3. Check metrics export interval:
   - Short intervals = more frequent exports
   - Longer intervals = more memory buffering

**Solution:**
```bash
# Reduce sampling for production
export OTEL_TRACES_SAMPLE_RATIO=0.1  # 10%

# Increase metrics export interval
export OTEL_METRICS_EXPORT_INTERVAL=120000  # 2 minutes
```

### Issue 3: Missing K8s Client Spans

**Symptoms:**
- HTTP spans appear in Jaeger
- No `k8s.` child spans visible

**Diagnosis Steps:**
1. Verify K8s client has tracer:
   ```bash
   # Check client initialization in logs
   ```

2. Verify context propagation:
   - Handlers should pass `r.Context()` to K8s methods
   - Tracer should be initialized in `NewClient()`

**Solution:**
- Ensure `client.go` initializes tracer and meter
- Verify all K8s methods accept `context.Context`
- Check for context cancellation

### Issue 4: WebSocket Reconnections Loop

**Symptoms:**
- High `watcher.pod.reconnects` counter
- Clients frequently disconnected

**Diagnosis Steps:**
1. Check `watcher.pod.session` span duration
2. Look for `reconnect.count` attribute
3. Review K8s API server logs

**Common Causes:**
- K8s API server restarting
- Network policies blocking watch connections
- Resource quotas exceeded
- Watch timeout (default 30 minutes)

**Solution:**
- Check K8s API server health
- Review network policies
- Increase session timeout if needed
- Add retry backoff

### Issue 5: Metrics Server Not Responding

**Symptoms:**
- High `k8s.metrics.pods.list` latency
- `k8s.errors` with error_type="NotFound"

**Diagnosis Steps:**
1. Check Metrics Server deployment:
   ```bash
   kubectl get pods -n kube-system | grep metrics-server
   ```

2. Test Metrics Server directly:
   ```bash
   kubectl get --raw /apis/metrics.k8s.io/v1beta1/namespaces/default/pods
   ```

**Solution:**
- Restart Metrics Server if needed
- Check resource limits
- Verify RBAC permissions

---

## Performance Considerations

### Overhead Breakdown

| Sampling Ratio | CPU Overhead | Memory Overhead | Network Overhead |
|----------------|--------------|-----------------|------------------|
| 100% (1.0)     | ~5-10%       | ~50-100MB       | ~2-5Mbps         |
| 50% (0.5)      | ~3-5%        | ~30-50MB        | ~1-2Mbps         |
| 10% (0.1)      | ~1-2%        | ~10-20MB        | ~0.2-0.5Mbps     |
| 1% (0.01)      | <1%          | ~5-10MB         | ~0.02-0.05Mbps   |

### Sampling Strategy by Environment

**Development:**
- Sample ratio: 1.0 (100%)
- Export interval: 30 seconds
- Goal: Complete visibility for debugging

**Staging:**
- Sample ratio: 0.5 (50%)
- Export interval: 60 seconds
- Goal: Balance visibility with resource usage

**Production:**
- Sample ratio: 0.1 (10%)
- Export interval: 60-120 seconds
- Goal: Minimal overhead with sufficient coverage

### High-Traffic Optimization

For clusters with >1000 pods or >100 WebSocket connections:

1. **Reduce sampling ratio**:
   ```bash
   export OTEL_TRACES_SAMPLE_RATIO=0.05  # 5%
   ```

2. **Increase export interval**:
   ```bash
   export OTEL_METRICS_EXPORT_INTERVAL=120000  # 2 minutes
   ```

3. **Use adaptive sampling** (future enhancement):
   - Sample more for slow requests
   - Sample less for health checks

---

## Troubleshooting

### Checklist for Issues

**No traces at all:**
- [ ] Jaeger/Collector is running
- [ ] OTEL_EXPORTER_OTLP_ENDPOINT is correct
- [ ] OTEL_SDK_DISABLED is not set to "true"
- [ ] Network connectivity to exporter
- [ ] Sampling ratio > 0

**Missing specific traces:**
- [ ] Context is propagated to child operations
- [ ] Tracer is initialized in the component
- [ ] Span is created and ended
- [ ] Sampling is not dropping the span (parent-based)

**High latency after instrumentation:**
- [ ] Sampling ratio is appropriate for environment
- [ ] Export interval is not too short
- [ ] Batch size is appropriate (256)
- [ ] No blocking on export (should be async)

**Memory leaks:**
- [ ] Spans are being ended
- [ ] No goroutine leaks in watchers
- [ ] Metrics buffers are being flushed
- [ ] WebSocket connections are cleaned up

### Diagnostic Commands

**Check OTel status:**
```bash
# View startup logs
journalctl -u kub -f | grep -i otel

# Check environment
env | grep OTEL

# Test exporter connectivity
nc -zv localhost 4317
```

**Monitor resource usage:**
```bash
# Memory and CPU
top -p $(pgrep kub)

# Goroutine count (if pprof enabled)
curl http://localhost:8080/debug/pprof/goroutine?debug=1
```

**Validate traces:**
```bash
# Generate test trace
curl http://localhost:8080/api/pods?namespace=default

# Check Jaeger UI
open http://localhost:16686
```

### Getting Help

If issues persist:

1. **Enable debug logging:**
   ```bash
   export OTEL_LOG_LEVEL=debug
   export DEBUG=true
   ```

2. **Collect diagnostic information:**
   - KUB version: `kub --version`
   - Go version: `go version`
   - OTel SDK versions in `go.mod`
   - Environment variables (redact secrets)
   - Sample trace IDs
   - Metric snapshots

3. **Check known issues:**
   - GitHub Issues: https://github.com/krzyzao/kub/issues
   - OpenTelemetry Go: https://github.com/open-telemetry/opentelemetry-go/issues

---

## Additional Resources

### Documentation
- [OpenTelemetry Go Documentation](https://opentelemetry.io/docs/instrumentation/go/)
- [OTel Specification](https://opentelemetry.io/docs/reference/specification/)
- [Semantic Conventions](https://opentelemetry.io/docs/reference/specification/semantic_conventions/)

### Tools
- [Jaeger Documentation](https://www.jaegertracing.io/docs/)
- [OpenTelemetry Collector](https://opentelemetry.io/docs/collector/)
- [Prometheus](https://prometheus.io/docs/)

### Code Reference
- Metrics definitions: `backend/internal/models/metrics.go`
- OTel configuration: `backend/internal/config/otel.go`
- Provider setup: `backend/internal/config/providers.go`
- Structured logging: `backend/internal/config/logs.go`

### Environment Variables
See `backend/.env.example` for complete configuration reference.

---

## Appendix: Span Naming Reference

### HTTP Spans
- Pattern: `{METHOD} {PATH}`
- Examples: `GET /api/pods`, `POST /api/contexts`

### K8s Client Spans
- Pattern: `k8s.{resource}.{operation}`
- Examples: `k8s.pods.list`, `k8s.nodes.get`, `k8s.metrics.pods.list`

### WebSocket Spans
- `ws.upgrade`: Connection upgrade
- `ws.initial_data`: Initial data fetch
- `ws.fetch_pods`: Pod list fetch
- `ws.fetch_metrics`: Metrics fetch
- `ws.fetch_summary`: Summary calculation
- `ws.logs.stream`: Log streaming session

### Watcher Spans
- `watcher.pod.session`: Pod watch session
- `watcher.metrics.fetch`: Metrics fetch cycle

---

**Document Version**: 1.0
**Last Updated**: 2025-01-28
**Maintainer**: KUB Team
