.PHONY: all build dev clean backend frontend install

# Use 'go' from PATH (works on macOS, Linux, Windows with Go installed)
GO ?= go
NPM ?= npm

# Default target
all: build

# Install dependencies
install:
	cd backend && $(GO) mod tidy
	cd frontend && $(NPM) install

# Build everything
build: build-frontend build-backend

# Build backend
build-backend:
	cd backend && $(GO) build -o ../bin/kub ./cmd/kub

# Build frontend
build-frontend:
	cd frontend && $(NPM) run build
	rm -rf backend/cmd/kub/static || true
	cp -r frontend/dist backend/cmd/kub/static

# Development mode - run both backend and frontend
dev:
	@echo "Starting development servers..."
	@echo "Backend: http://localhost:8080"
	@echo "Frontend: http://localhost:5173"
	@make -j2 dev-backend dev-frontend

# Run backend in dev mode
dev-backend:
	cd backend && $(GO) run ./cmd/kub

# Run frontend in dev mode
dev-frontend:
	cd frontend && $(NPM) run dev

# Run production build
run: build
	./bin/kub

# Clean build artifacts
clean:
	rm -rf bin/
	rm -rf frontend/dist
	rm -rf backend/cmd/kub/static
	rm -rf frontend/node_modules

# Format code
fmt:
	cd backend && $(GO) fmt ./...
