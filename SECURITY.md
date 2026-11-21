# Security Policy

## Supported versions

| Version | Supported |
| ------- | --------- |
| 2.x     | yes       |
| 1.x     | no (upgrade: docs/deployment.md) |

## Reporting a vulnerability

Report it privately through [GitHub's private vulnerability reporting](https://github.com/steph-dm/MyUta/security/advisories/new).
Include a description, steps to reproduce and the impact. I acknowledge reports within
48 hours and aim to fix confirmed issues within 7 days.

## Scope

- Authentication, sessions, password reset and e-mail confirmation
- Access to other users' data
- GraphQL abuse (cost, depth, batching), CSRF, upload handling
- Exposure of API keys or secrets

Not in scope: self-hosted instances with insecure configuration (e.g. `APP_ENV=development`
on the internet, or `TRUSTED_PROXIES` covering untrusted networks), social engineering.

## Security design notes

- Sessions are stored server-side (table `sessions`); the cookie is HttpOnly, SameSite=Lax and
  Secure outside development. Logout, password change and reset revoke sessions.
- Every API request must carry the `X-MyUta-Client` header (blocks cross-site form posts);
  GraphQL is POST-only.
- Client IP for rate limits comes from `X-Real-IP`/`X-Forwarded-For` only when the direct
  peer is in `TRUSTED_PROXIES` or is the loopback address (a proxy on the same host).
  The resolved address is logged as `client_ip` in the access log.
- Queries are limited by cost, depth and number of root fields; request bodies by size.
