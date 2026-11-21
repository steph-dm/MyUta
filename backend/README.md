# MyUta backend

Go 1.26 GraphQL API (gqlgen) on PostgreSQL. Structure: see `../docs/architecture.md`.

```bash
cp .env.example .env
go run ./cmd/server                    # http://localhost:4000 (GraphiQL at / in development)
go run ./cmd/migrate status            # migrations
go run ./cmd/migrate create add_thing  # new migration file
go test ./...                          # unit tests
TEST_DATABASE_URL=postgres://…/postgres go test -tags integration ./...   # with PostgreSQL
go tool gqlgen generate                # after editing schema.graphql
golangci-lint run ./...
```

GraphiQL needs the header `{"X-MyUta-Client": "graphiql"}` (CSRF protection).

## Endpoints

| Path | |
| --- | --- |
| `POST /graphql` | JSON or multipart (uploads). GET is not accepted. |
| `GET /export?format=json\|csv` | file download for the signed-in user |
| `GET /healthz` | 200 when the database answers |
| `GET /livez` | 200 when the process runs |

## Errors

Every error has `extensions.code` (`BAD_USER_INPUT`, `UNAUTHENTICATED`, `NOT_FOUND`,
`CONFLICT`, `RATE_LIMITED`, `FEATURE_DISABLED`, `SERVICE_UNAVAILABLE`, `PAYLOAD_TOO_LARGE`,
`INTERNAL_SERVER_ERROR`, plus gqlgen's validation codes). Application errors also carry a
stable `reason` (e.g. `EMAIL_TAKEN`, `DUPLICATE_SONG`) and `field`; see `internal/apperror`.

## Limits

Query cost 2000 (lists cost page size × fields), depth 10, 15 root fields; JSON bodies 1 MB,
uploads 10 MB; imports up to 5000 takes.
