# KUB - Kubernetes Dashboard z Wizualizacjami

## Cel
Lokalna aplikacja webowa do monitoringu klastra K8s z atrakcyjnymi wizualizacjami, podobna do k9s ale w przeglądarce.

## Stos Technologiczny

### Backend: Go
- **Dlaczego**: Natywne `client-go` (oficjalna biblioteka K8s), świetna obsługa WebSocket, jeden binary, szybki start
- **Biblioteki**: client-go, gorilla/websocket, chi (router)

### Frontend: React + TypeScript + Tailwind
- **Dlaczego**: Bogaty ekosystem wykresów, shadcn/ui dla komponentów, dobra obsługa real-time
- **Biblioteki**: Vite, shadcn/ui, Recharts (wykresy), Lucide (ikony)

---

## Architektura

```
┌─────────────────────────────────────────────────────────┐
│                    Przeglądarka                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │           React Frontend (Vite)                  │   │
│  │  - Dashboard z wykresami CPU/RAM                │   │
│  │  - Lista podów z real-time statusem             │   │
│  │  - Wizualizacja lifecycle podów                 │   │
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
│  │  - Watch API dla real-time updates              │   │
│  │  - Metrics Server dla CPU/RAM                   │   │
│  │  - Kubeconfig z ~/.kube/config                  │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   Klaster Kubernetes  │
              └───────────────────────┘
```

---

## MVP - Funkcjonalności

### 1. Metryki CPU/RAM (wykresy)
- Wykresy liniowe dla nodów i podów
- Gauge (zegar) dla aktualnego wykorzystania
- Wymaganie: Metrics Server w klastrze

### 2. Stan Podów z Lifecycle
- Lista podów z kolorowym statusem (Running/Pending/Failed/Terminating)
- **Real-time animacje** przy:
  - Tworzeniu nowego poda (zielone podświetlenie, animacja "wchodzenia")
  - Zabijaniu poda (czerwone podświetlenie, animacja "wychodzenia")
  - Restarcie (żółta animacja przejścia)
- Timeline ostatnich zmian stanów

### 3. Przełączanie kontekstu/namespace
- Dropdown z dostępnymi kontekstami K8s
- Filtrowanie po namespace

---

## Struktura Projektu

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
│   │   │   ├── PodList.tsx      # Lista z animacjami
│   │   │   ├── PodCard.tsx      # Pojedynczy pod
│   │   │   ├── NodeList.tsx     # Lista nodów
│   │   │   ├── DeploymentList.tsx # Lista deployments
│   │   │   ├── DeploymentCard.tsx # Pojedynczy deployment
│   │   │   ├── ServiceList.tsx  # Lista services
│   │   │   ├── ServiceCard.tsx  # Pojedynczy service
│   │   │   ├── ConfigMapList.tsx # Lista configmaps
│   │   │   ├── ConfigMapCard.tsx # Pojedynczy configmap
│   │   │   ├── MetricsChart.tsx # Wykresy CPU/RAM
│   │   │   ├── GaugeChart.tsx   # Zegary/gauge
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

## Plan Implementacji

### Faza 0: Inicjalizacja repozytorium ✅
1. `git init` w folderze `/Users/krzyzao/dev/kub`
2. Utworzenie `.gitignore` (node_modules, dist, binary Go, .env, itp.)
3. Skopiowanie tego planu do `docs/PLAN.md` w projekcie
4. Pierwszy commit

### Faza 1: Szkielet projektu ✅
1. Inicjalizacja Go module + podstawowy serwer HTTP
2. Inicjalizacja Vite + React + TypeScript + Tailwind
3. Konfiguracja shadcn/ui
4. Proxy dev server (Vite -> Go backend)

### Faza 2: Połączenie z K8s ✅
1. Klient K8s z client-go (kubeconfig)
2. REST endpoint: GET /api/namespaces
3. REST endpoint: GET /api/pods?namespace=X
4. REST endpoint: GET /api/nodes

### Faza 3: Real-time (WebSocket) ✅
1. WebSocket hub w Go
2. Watch na pody z client-go
3. Hook useWebSocket w React
4. Real-time lista podów z animacjami lifecycle

### Faza 4: Metryki i wizualizacje ✅
1. Integracja z Metrics Server (metrics.k8s.io)
2. Wykresy CPU/RAM z Recharts
3. Gauge components dla aktualnych wartości

### Faza 5: Polish 🔄
1. Context/namespace selector ✅
2. Responsywny layout ✅
3. Error handling + loading states ✅
4. Build produkcyjny (embed frontend w Go binary)

---

## Backlog (przyszłe funkcje)
- [ ] Topologia klastra (grafy połączeń)
- [ ] Timeline eventów
- [ ] Logi podów (streaming)
- [ ] Exec do kontenera (terminal w przeglądarce)
- [x] Deployments, Services, ConfigMaps
- [ ] Dark mode

---

## Weryfikacja

1. **Uruchomienie**: `make dev` - startuje backend + frontend
2. **Test połączenia**: Dashboard pokazuje listę namespace'ów
3. **Test real-time**:
   ```bash
   kubectl run test-pod --image=nginx
   kubectl delete pod test-pod
   ```
   Obserwować animacje w UI
4. **Test metryk**: Wykresy CPU/RAM aktualizują się

---

## Wymagania systemowe
- Go 1.21+
- Node.js 18+
- kubectl skonfigurowany (~/.kube/config)
- Metrics Server w klastrze (dla metryk CPU/RAM)
