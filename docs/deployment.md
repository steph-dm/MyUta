# Deployment

Two containers plus PostgreSQL 16:

- **backend** (`backend/Dockerfile`): the Go API on port 4000, with `/app/server` and
  `/app/migrate`. Distroless, runs as non-root, checks its own health (`/app/server -healthcheck`).
- **frontend** (`frontend/Dockerfile`): nginx serving the app and proxying `/graphql` and
  `/export` to the backend. Only this one is exposed to the internet.

## Docker Compose (self-hosting)

```bash
cp .env.example .env     # set POSTGRES_PASSWORD, JWT_SECRET (openssl rand -base64 48), CORS_ORIGINS…
make up                  # http://localhost:3000
```

Put a TLS-terminating proxy in front for anything public, set `CORS_ORIGINS` and
`FRONTEND_URL` to the public origin, and set `REAL_IP_FROM` to that proxy's address so rate
limits see real client addresses.

## Environment variables

Backend (see `backend/.env.example` for all of them):

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL URL |
| `JWT_SECRET` | yes | ≥ 32 bytes outside development; changing it signs everyone out |
| `APP_ENV` | | `production` (default) or `development` |
| `CORS_ORIGINS` | yes in production | comma-separated app origins |
| `FRONTEND_URL` | | base of e-mailed links (default: first CORS origin) |
| `TRUSTED_PROXIES` | | CIDRs of proxies allowed to set `X-Real-IP` (the frontend's network) |
| `RUN_MIGRATIONS` | | `true` (default) runs migrations on start; `false` to run `/app/migrate up` yourself |
| `SESSION_TTL` | | default `168h`; active sessions are extended |
| `YOUTUBE_API_KEY`, `ANTHROPIC_API_KEY`, `SMTP_*` | | optional features; hidden in the UI when unset |

Frontend (runtime, nginx): `BACKEND_URL`, `NGINX_RESOLVER` (DNS server used to look up the
backend at request time), `REAL_IP_FROM`, `CSP_ANALYTICS_ORIGIN`. Build time:
`VITE_UMAMI_SCRIPT_URL`, `VITE_UMAMI_WEBSITE_ID`.

## Railway

1. Services: **Postgres** (Railway plugin), **backend** (root directory `backend`, Dockerfile
   build), **frontend** (root directory `frontend`, Dockerfile build, public domain).
2. Backend variables: `DATABASE_URL=${{Postgres.DATABASE_URL}}`, `APP_ENV=production`,
   `JWT_SECRET`, `CORS_ORIGINS=https://<frontend domain>`, `FRONTEND_URL` (same),
   `TRUSTED_PROXIES` covering Railway's private network (IPv6 ULA; `fc00::/7` covers it),
   optional keys. Either keep `RUN_MIGRATIONS=true`, or set it to `false` and add the
   pre-deploy command `/app/migrate up`.
3. Frontend variables: `BACKEND_URL=http://${{backend.RAILWAY_PRIVATE_DOMAIN}}:4000`,
   `NGINX_RESOLVER` = Railway's internal DNS server (check Railway's private-networking
   documentation for the current address; it is an IPv6 address, written in brackets, e.g.
   `[fd12::10]`), `REAL_IP_FROM` = the range Railway's edge proxy connects from (look at the
   peer addresses in the frontend logs), build variables for Umami if wanted.
4. Health checks: backend `/healthz` (includes the database), frontend `/nginx-health`.

Verify after the first deploy: open the app from two different networks (e.g. Wi-Fi and a
phone on mobile data) and compare the `client_ip` field in the backend's request logs. If
every request shows the same address, `REAL_IP_FROM` (frontend) or `TRUSTED_PROXIES`
(backend) is not right, and all users would share one rate-limit budget.

## Installing the app and sharing photos (Android)

The app is a Progressive Web App. On Android, open it in Chrome over HTTPS and choose
**Install app** (or *Add to Home screen*). After that, MyUta appears in the **Share** menu
for images: sharing a result photo opens "Log a take" with the photo attached. The share is
handled by the service worker (`public/sw.js`); if it is not active yet (right after
installing), nginx answers `/share-target` with a hint to open the app once and share again.
The service worker is only registered in production builds.

## Upgrading from 1.x

Version 2 converts the database in place (migration 005: snake_case columns, calendar-day
dates, machine table, merged duplicate artists/songs, sessions, goals…). It cannot be undone
automatically, so take a backup and rehearse first.

1. **Back up:** `pg_dump -Fc "$DATABASE_PUBLIC_URL" > myuta-before-v2.dump`
2. **Rehearse locally** with the same PostgreSQL major version:
   ```bash
   createdb myuta_rehearsal && pg_restore -d myuta_rehearsal myuta-before-v2.dump
   cd backend
   DATABASE_URL=postgresql://…/myuta_rehearsal go run ./cmd/migrate status
   DATABASE_URL=postgresql://…/myuta_rehearsal go run ./cmd/migrate up
   ```
   The migration stops (and changes nothing) if two accounts differ only in the letter case
   of their e-mail address. Decide which account to keep, delete the other in production,
   and take a new dump. To see what the migration did (merged duplicates, row counts), run the
   SQL file in `psql` inside `BEGIN; … ROLLBACK;`; it prints NOTICE lines.
3. **Configure** the new variables (`APP_ENV`, a new `JWT_SECRET`, `CORS_ORIGINS`,
   `FRONTEND_URL`, `TRUSTED_PROXIES`, frontend `NGINX_RESOLVER`/`REAL_IP_FROM`).
4. **Deploy** both services. Migrations run on start (an advisory lock prevents two
   instances from migrating at once), or run `/app/migrate up` as a pre-deploy step.
5. Everyone signs in again once (the session system changed).

**Rollback:** `pg_restore --clean --if-exists -d "$DATABASE_PUBLIC_URL" myuta-before-v2.dump`,
then redeploy the 1.x commit.

**No users yet?** Instead of converting, start from an empty schema
(`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`) and deploy; migrations 001–005 build it.
