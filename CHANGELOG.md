# Changelog

## 2.0.0 (unreleased)

Rewrite following the full review (`docs/REVIEW_CHECKLIST.md` lists every item and its status).

**Upgrade notes:** the database is converted by migration 005 (take a backup and rehearse
first, see `docs/deployment.md`); everyone signs in again once; new environment variables
(`APP_ENV` defaults to production, `CORS_ORIGINS`, `TRUSTED_PROXIES`, `REAL_IP_FROM`,
`NGINX_RESOLVER`, optional `SMTP_*`); npm 11 is required for the frontend.

**New**
- K-STAGE as a third machine; per-machine score bands; machine registry on both sides
- Several takes per day, key change, version, score breakdown, goals, personal bests
- Android Share target: share a result photo from the Gallery or Google Photos to the
  installed app; HEIC photos are converted to JPEG in the browser
- Password reset and e-mail confirmation, log out everywhere, sliding sessions
- Delete and merge artists, delete songs, CSV import and versioned JSON/CSV export
- One global YouTube player with a practice queue of favourites
- Language saved in the profile; search ignores letter width and hiragana/katakana

**Fixed** (highlights): server errors for second takes on the same day, invisible songs
without takes, rate-limit bypass through forged headers, e-mail case sensitivity, byte-based
limits for Japanese text, password change logging the user out, import errors, logouts on
database restarts, the photo import losing the song, table selection being cleared, the
player being created twice.

**Under the hood:** server-side sessions, CSRF header, query cost/depth limits, typed
GraphQL errors with stable reasons, generated frontend types, tests against PostgreSQL,
ESLint/Prettier, CI with integration tests, govulncheck and image builds, distroless
backend image, nginx with dynamic upstream and pre-compressed assets.
