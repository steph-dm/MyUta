# Architecture

```
browser ──HTTPS──> nginx (frontend container)
                    ├─ static files (precompressed, immutable /assets)
                    └─ /graphql, /export ──> Go API (backend container) ──> PostgreSQL
```

## Backend (`backend/`)

| Package | Role |
| --- | --- |
| `cmd/server`, `cmd/migrate` | entry points (server; migrations up/status/create) |
| `internal/app` | wiring: storage, services, middleware chain, routes (also used by integration tests) |
| `internal/config` | environment variables, checked at start-up |
| `internal/middleware` | request id, access log, recovery, security headers, CORS, CSRF header, body limit, client IP, session |
| `internal/session`, `internal/auth` | server-side sessions in a signed cookie; JWT and bcrypt helpers |
| `internal/graph` | GraphQL schema implementation, limits, error presenter, dataloaders |
| `internal/service` | business rules (accounts, library, takes, media, import/export) |
| `internal/storage/postgres` | SQL through Bun; tenant (user) filter on every query |
| `internal/domain`, `internal/validator`, `internal/apperror` | registries, input rules, error codes/reasons |
| `internal/ocr`, `internal/youtube`, `internal/mail` | optional external services |
| `internal/database` | connection pool and goose migrations (advisory lock) |

Errors: services return `apperror.AppError` (code + reason + field); the presenter shows those
and GraphQL validation errors, everything else is logged and masked.

## Frontend (`frontend/src/`)

| Folder | Role |
| --- | --- |
| `graphql/` | all operations; types are generated into `gql/` from `backend/schema.graphql` |
| `lib/` | Apollo client, error translation, machine registry, dates, YouTube, uploads, score card |
| `contexts/` | auth (session expiry without reloads), theme, the global player |
| `components/` | shared UI, review table and dialogs, song/artist/profile parts, layout |
| `pages/` | lazily loaded routes |
| `i18n/` | translations; each language/namespace is loaded on demand |

Lists are paginated, filtered and sorted on the server. After a mutation that changes a list,
the affected queries are refetched by name; updates of single objects come back in the
mutation result and update the normalised cache.
