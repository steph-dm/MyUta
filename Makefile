.PHONY: dev dev-backend dev-frontend db test test-integration lint build clean up down seed

db:
	docker compose up postgres -d

dev-backend:
	cd backend && go run ./cmd/server

dev-frontend:
	cd frontend && npm run dev

# Run both (two shells needed — use this as a reference)
dev: db
	@echo "Run 'make dev-backend' and 'make dev-frontend' in separate terminals"

test:
	cd backend && go test -race -count=1 ./...

# Requires Docker
test-integration:
	cd backend && go test -race -count=1 -tags integration -timeout 120s ./...

lint:
	cd backend && golangci-lint run ./...
	cd frontend && npx tsc --noEmit

build:
	cd backend && CGO_ENABLED=0 go build -ldflags="-s -w" -o bin/server ./cmd/server
	cd frontend && npm run build

up:
	docker compose up --build -d

down:
	docker compose down

# Load sample data
seed:
	docker exec -i myuta-postgres-1 psql -U myuser -d myuta < backend/seed_test_data.sql

clean:
	rm -rf backend/bin frontend/build
