.PHONY: help db dev-backend dev-frontend test test-integration lint codegen check build up down logs seed migrate-status clean

TEST_DATABASE_URL ?= postgresql://$(or $(POSTGRES_USER),myuser):$(or $(POSTGRES_PASSWORD),change-me)@localhost:5432/postgres?sslmode=disable

help: ## list targets
	@grep -E '^[a-z-]+:.*##' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  %-18s %s\n", $$1, $$2}'

db: ## start only PostgreSQL (for local development)
	docker compose up -d postgres

dev-backend: ## run the API on :4000 (reads backend/.env)
	cd backend && go run ./cmd/server

dev-frontend: ## run the Vite dev server on :3000 (proxies the API)
	cd frontend && npm run dev

test: ## unit tests (no database)
	cd backend && go test -race -count=1 ./...
	cd frontend && npm test

test-integration: db ## backend tests against PostgreSQL (throwaway databases)
	cd backend && TEST_DATABASE_URL="$(TEST_DATABASE_URL)" go test -race -count=1 -tags integration ./...

lint: ## all linters and format checks
	cd backend && golangci-lint run ./...
	cd frontend && npm run typecheck && npm run lint && npm run format:check && npm run check:i18n

codegen: ## regenerate GraphQL code (backend resolvers interface, frontend types)
	cd backend && go tool gqlgen generate
	cd frontend && npm run codegen

check: codegen lint test ## everything CI runs (except Docker builds)

build: ## build binaries and the static site
	cd backend && CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o bin/server ./cmd/server && CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o bin/migrate ./cmd/migrate
	cd frontend && npm run build

up: ## build and start the whole stack (http://localhost:3000)
	docker compose up --build -d

down: ## stop the stack
	docker compose down

logs: ## follow logs
	docker compose logs -f

seed: ## load demo data (taro.tanaka@example.com / Demo-karaoke-2026); local only!
	docker compose exec -T postgres sh -c 'psql -v ON_ERROR_STOP=1 -U "$$POSTGRES_USER" -d "$$POSTGRES_DB"' < backend/seed_test_data.sql

migrate-status: ## show applied migrations
	docker compose exec backend /app/migrate status

clean:
	rm -rf backend/bin frontend/build frontend/coverage
