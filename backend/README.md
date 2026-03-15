# MyUta Backend

Go + GraphQL API using gqlgen and Bun ORM on PostgreSQL.

## Running it

```bash
cp .env.example .env   # fill in DATABASE_URL and JWT_SECRET at minimum
docker compose up postgres -d   # from project root
go run ./cmd/server
```

Migrations run on startup. GraphQL playground is at `http://localhost:4000/` in dev mode, API at `/graphql`, health check at `/healthz`.

Check `.env.example` for all config options.

## Code generation

After editing `schema.graphql`:

```bash
go run github.com/99designs/gqlgen generate
```

or just `go generate ./...`. If it complains about missing modules, run `go get github.com/99designs/gqlgen` first.

## Tests

```bash
go test ./...
```

## Sample data

`seed_test_data.sql` has test data you can load — 10 artists, 28 songs, 35 reviews with Japanese notes:

```bash
docker exec -i myuta-postgres-1 psql -U myuser -d myuta < backend/seed_test_data.sql
```

## Layout

`cmd/server/` — entry point
`internal/service/` — business logic
`internal/storage/` — database layer
`internal/graph/` — GraphQL resolvers + generated code
`schema.graphql` — schema definition
