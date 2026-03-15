# MyUta (マイウタ)

Personal karaoke score tracker — keep track of sessions, songs, and scores so you can see how you're improving over time. Supports English and Japanese.

Go + GraphQL backend, React + Vite frontend, PostgreSQL.

## Getting started

You'll need Docker, Go 1.26+, and Node 20+.

**1. Copy the env files:**

```bash
cp .env.example .env
cp backend/.env.example backend/.env
```

Root `.env` is for Docker Compose, `backend/.env` is for running the backend directly. The defaults work out of the box for local development.

**2. Start Postgres:**

```bash
docker compose up postgres -d
```

**3. Run the backend:**

```bash
cd backend
go run ./cmd/server
```

Database tables are created automatically on first start.

API is at `http://localhost:4000/graphql`, health check at `http://localhost:4000/healthz`.

**4. Run the frontend:**

```bash
cd frontend
npm install
npm run dev
```

Frontend is at `http://localhost:3000`.

## Sample data

There's a seed file with sample songs, artists, and karaoke scores you can load to try things out:

```bash
docker exec -i myuta-postgres-1 psql -U myuser -d myuta < backend/seed_test_data.sql
```

Login with `john.smith@example.com` / `password123`

## Docker (full stack)

```bash
docker compose up --build
```

Backend at `http://localhost:4000/graphql`, frontend at `http://localhost:3000`.
