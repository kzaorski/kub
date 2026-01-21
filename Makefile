.PHONY: all build dev clean backend frontend install

# Default target
all: build

# Install dependencies
install:
	cd backend && /opt/homebrew/bin/go mod tidy
	cd frontend && npm install

# Build everything
build: build-frontend build-backend

# Build backend
build-backend:
	cd backend && /opt/homebrew/bin/go build -o ../bin/kub ./cmd/kub

# Build frontend
build-frontend:
	cd frontend && npm run build
	rm -rf backend/cmd/kub/static
	cp -r frontend/dist backend/cmd/kub/static

# Development mode - run both backend and frontend
dev:
	@echo "Starting development servers..."
	@echo "Backend: http://localhost:8080"
	@echo "Frontend: http://localhost:5173"
	@make -j2 dev-backend dev-frontend

# Run backend in dev mode
dev-backend:
	cd backend && /opt/homebrew/bin/go run ./cmd/kub

# Run frontend in dev mode
dev-frontend:
	cd frontend && npm run dev

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
	cd backend && /opt/homebrew/bin/go fmt ./...

# Type check frontend
typecheck:
	cd frontend && npm run typecheck
