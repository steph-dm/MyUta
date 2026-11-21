# Review checklist

Every finding and sub-point from `MyUta_review.txt`, one line each.
Status: `[ ]` open, `[x]` done. Notes say what was done when it is not obvious.


**Status (2.0):** `[x]` done, `[~]` done differently or partly (see the note on the line).
Verification: backend unit tests and integration tests against PostgreSQL, golangci-lint,
frontend unit/component tests, ESLint/TypeScript/Prettier/translation checks, a production
build, and an end-to-end run in headless Chromium through nginx (login with `?next=`,
dashboard, logging a take, song page with chart, language switch, Android share target with
PNG and HEIC photos, session expiry dialog, mobile menu, public 404).

## 2. Functional bugs
- [x] F-01.1 Drop `idx_reviews_user_song_date` (several takes per day, per machine)
- [x] F-01.2 Store the performance day as `DATE`
- [x] F-01.3 Import detects duplicates explicitly instead of relying on the index
- [x] F-01.4 Order reviews by `date DESC, created_at DESC`
- [x] F-01.5 Editing a review onto the date of another review works
- [x] F-02.1 Error presenter shows gqlgen validation/parse errors
- [x] F-02.2 `UnmarshalDate/DateTime` return BAD_USER_INPUT
- [x] F-02.3 Malformed requests are not logged at ERROR level
- [x] F-03 Depth limiter uses OperationContextMutator (no panic)
- [x] F-04.a Duplicate song title -> CONFLICT
- [x] F-04.b Delete artist with songs -> handled (no internal error)
- [x] F-04.c Register: trim before existence check
- [x] F-04.d Update profile: trim before existence check
- [x] F-04.e Edit review onto another date -> works (F-01)
- [x] F-04.f Invalid import file -> BAD_USER_INPUT
- [x] F-04.g Favourite double click -> idempotent, race-free
- [x] F-04.h Oversized body -> 413 PAYLOAD_TOO_LARGE with clear message
- [x] F-04.i Unique violations mapped centrally (SQLSTATE 23505 -> ErrConflict -> CONFLICT)
- [x] F-05.1 Songs listed by owner, not through reviews
- [x] F-05.2 Artists listed by owner, not through reviews
- [x] F-05.3 Delete song in the UI (confirmation with review count)
- [x] F-05.4 Delete artist in the UI (confirmation with counts)
- [x] F-05.5 Import does not leave songs behind for rejected rows
- [x] F-06.1 One transactional `logReview` mutation
- [x] F-06.2 Song edit (artist change) is one server operation
- [x] F-06.3 Store transactions usable by services (RunInTx used)
- [x] F-07.1 E-mail normalised (trim + lowercase) in one place
- [x] F-07.2 Migration lowercases existing e-mails, constraint enforces it
- [x] F-08.1 Password change re-issues the session cookie
- [x] F-08.2 No second-precision comparison problem (server-side sessions)
- [x] F-08.3 Password change logs out the other sessions
- [x] F-09.1 Name/title/artist/notes limits count characters
- [x] F-09.2 Password limit message says bytes
- [x] F-10.1 Password rule accepts any strong password (length-based)
- [x] F-10.2 Rule defined once, exposed to the client
- [x] F-11.a No raw driver errors; duplicates counted separately
- [x] F-11.b Structured row errors {row, field, code, message}
- [x] F-11.c YouTube URL validated on import
- [x] F-11.d Issues de-duplicated and notes normalised on import
- [x] F-11.e No song created for rejected rows
- [x] F-11.f Old dates importable
- [x] F-11.g UI shows the row errors
- [x] F-11.h Import is one transaction
- [x] F-11.i Row count cap
- [x] F-11.j Export format has a version
- [x] F-12.1 Auth lookup error -> 503, not anonymous
- [x] F-12.2 Frontend: only UNAUTHENTICATED logs out; 503 shows "unavailable"
- [x] F-12.3 Retry once on connection errors in the session lookup
- [x] F-13.1 Dates are DATE end to end (no UTC day shift)
- [x] F-13.2 Dashboard sessions count uses the DATE column
- [x] F-14.1 `serverInfo` capability flags
- [x] F-14.2 Buttons hidden/disabled when a feature is off
- [x] F-14.3 FEATURE_DISABLED code, no vendor name in message
- [x] F-15.1 Artist names normalised (NFKC, trim, collapse spaces, lowercase) for comparison
- [x] F-15.2 Unique index per user on normalised artist name
- [x] F-15.3 Rename onto existing name -> CONFLICT + merge option
- [x] F-15.4 Same normalisation for song titles
- [x] F-15.5 Same normalisation in client-side matching
- [x] F-15.6 Migration merges existing duplicates

## 3. Security
- [x] S-01.1 ClientIP: SplitHostPort + netip, trusted proxies configurable
- [x] S-01.2 IPv6 handled
- [x] S-01.3 Backend port not published in compose
- [x] S-01.4 nginx sends a trustworthy X-Real-IP; real_ip documented
- [x] S-02.1 Dummy bcrypt compare for unknown e-mails
- [x] S-02.2 Registration does not reveal taken names (name uniqueness dropped)
- [x] S-03 Token removed from API responses and client documents
- [x] S-04.1 APP_ENV defaults to production
- [x] S-04.2 Weak/placeholder secret refused outside development
- [x] S-05 YouTube key sent in header
- [x] S-06.1 Logout revokes the session server-side
- [x] S-06.2 Forgot-password flow
- [x] S-06.3 E-mail change requires password + verification
- [x] S-06.4 Sliding session refresh
- [x] S-06.5 Per-account login limit
- [x] S-06.6 Rate limiter counts failures only where appropriate
- [x] S-06.7 Log out everywhere
- [x] S-07 GET transport removed; custom CSRF header required
- [x] S-08.1 `npm audit fix` (react-router)
- [x] S-08.2 Go image on the current patch release
- [x] S-08.3 govulncheck in CI
- [x] S-09 Analytics: no user content in events; privacy note
- [x] S-10.1 JWT: HS256 only, exp required, VerifyToken returns errors
- [x] S-10.2 NOT_FOUND instead of FORBIDDEN for other users' objects
- [x] S-10.3 `me` for deleted user -> null
- [x] S-10.4 CSP built from configuration, defined once
- [x] S-10.5 HSTS without preload
- [x] S-10.6 Complexity weights list fields; root-field/alias limit

## 4. Backend robustness
- [x] B-01.a OCR: unknown machine -> null
- [x] B-01.b OCR: date optional
- [x] B-01.c OCR: notes in the user's language
- [x] B-01.d OCR: failures are AppErrors with codes
- [x] B-01.e OCR timeout below server write timeout
- [x] B-01.f Rune-safe truncation in logs
- [x] B-01.g Structured output via tool use; stop_reason checked
- [x] B-01.h Extracted date/score validated
- [x] B-01.i Genre/issue lists defined once
- [x] B-01.j Model documented as configurable
- [x] B-01.k Media type sniffed from bytes
- [x] B-02 One upload/body limit, consistent messages, multipart uploads
- [x] B-03.1 YouTube result cache
- [x] B-03.2 No automatic search for known songs with a URL
- [x] B-03.3 videoEmbeddable=true
- [x] B-03.4 Result order preserved
- [x] B-03.5 Durations with days / live handled
- [x] B-04.1 Auth middleware only on API routes
- [x] B-04.2 Short session cache
- [x] B-05.1 Create vs update song are separate operations
- [x] B-05.2 Existing-song lookup in SQL with normalised title
- [x] B-05.3 Empty artists kept (visible), no silent deletes
- [x] B-05.4 Moving a review to another song not possible by accident (updateReview keeps song)
- [x] B-05.5 Duplicate service methods removed
- [x] B-05.6 MyReviews caller check removed (no argument)
- [x] B-05.7 ErrNotFound conversion consistent
- [x] B-05.8 No 10-year date limit
- [x] B-05.9 Date validated without string round trip
- [x] B-06.1 Dashboard in one query
- [x] B-06.2 Per-machine stats generic
- [x] B-06.3 Deterministic "most practised"
- [x] B-06.4 Session fields named for 30-day windows
- [x] B-06.5 Profile uses server stats
- [x] B-07.1 Access log has request id
- [x] B-07.2 Access log has operation name, user id, error codes
- [x] B-07.3 Duration in milliseconds
- [x] B-07.4 ResponseWriter Unwrap/Flush
- [x] B-07.5 gqlgen recover logs through slog
- [x] B-08.1 Goose provider with session lock; migrations can run as a separate step
- [x] B-08.2 cmd/migrate sequential names, sanitised, any cwd
- [x] B-08.3 GraphQL query cache
- [x] B-08.4 Pool settings / retry after DB restart

## 5. Database
- [x] D-01.1 DATE column
- [x] D-01.2 NUMERIC(6,3) score + CHECK 0..100
- [x] D-01.3 Machine type constrained (reference table)
- [x] D-02.1 E-mail lowercase unique
- [x] D-02.2 Name NOT NULL everywhere
- [x] D-02.3 Global name uniqueness dropped
- [x] D-02.4 isAdmin and admin-only queries removed
- [x] D-03.1 Unique normalised artist name
- [x] D-03.2 Title conflicts handled
- [x] D-03.3 Old single-column FKs dropped
- [x] D-04.1 Redundant review indexes dropped
- [x] D-04.2 Redundant favourite indexes dropped
- [x] D-04.3 Favourites keyed by (user, song/artist)
- [x] D-05.1 snake_case columns
- [x] D-05.2 uuid ids
- [x] D-05.3 updated_at maintained by trigger only
- [x] D-05.4 Old destructive migrations log row counts
- [x] D-05.5 Migration 003 Down fixed
- [x] D-05.6 Migration 001 without IF NOT EXISTS

## 6. GraphQL API
- [x] A-01.1 One Review type
- [x] A-01.2 Duplicate/unused queries removed or used
- [x] A-02.1 No userId argument on review queries
- [x] A-02.2 No unused selections (user(id), Review.user)
- [x] A-02.3 No repeated song inside song.reviews
- [x] A-02.4 IDs typed as ID
- [x] A-02.5 Profile update without id, Omittable instead of clear flag
- [x] A-02.6 isFavorite non-null
- [x] A-02.7 `me` returns null when anonymous
- [x] A-03.1 Paginated reviews with server-side filters
- [x] A-03.2 Default limits on songs/artists; frontend paginates
- [x] A-03.3 Dashboard asks for latest N
- [x] A-04 Input objects; structs in Go
- [x] A-05.1 Dataloaders for review count / reviews / artist / songs / favourites
- [x] A-05.2 Empty-songs artist does not trigger extra query
- [x] A-06 Related data loaded by field resolvers, not services
- [x] A-07 setSongFavorite / setArtistFavorite returning the object
- [x] A-08.1 Stable `reason` in extensions
- [x] A-08.2 RATE_LIMITED code with retryAfterSeconds
- [x] A-09.1 Export as GET /export (JSON, CSV)
- [x] A-09.2 Image upload via multipart Upload
- [x] A-09.3 searchYoutube is a mutation
- [x] A-09.4 ExtractedReview.date uses the Date scalar

## 7. Backend organisation
- [x] O-01.1 pkg/ moved under internal/
- [x] O-01.2 Rate limiter in its own package
- [x] O-01.3 No transport helpers (Loaded*) in storage models
- [x] O-01.4 One storage struct per table
- [x] O-02 user id in the WHERE clause of every store method
- [x] O-03 Dead code removed (RunInTx used, BatchReviewCounts used, SongExists, GetSongArtistID, validator.UUID, LoggerFromContext used, IsValid used, 10 MB check, ErrNotFound branches, tools.go, empty models_gen)
- [x] O-04.1 Consistent store interfaces per service
- [x] O-04.2 Not-found handled consistently
- [x] O-04.3 No variadic optional args
- [x] O-04.4 No hand-written array parser
- [x] O-04.5 No positional raw-SQL scan of joined rows
- [x] O-04.6 Timestamps set in one place
- [x] O-04.7 VerifyToken error semantics
- [x] O-05.1 .golangci.yml
- [x] O-05.2 Rate-limit rules in one table
- [x] O-05.3 time.Duration in limiter
- [x] O-05.4 @auth directive

## 8. Frontend bugs
- [x] FE-01 OCR import keeps the song when the artist exists
- [x] FE-02.a Player not created twice
- [x] FE-02.b Player error handling (embedding disabled)
- [x] FE-02.c Visible player (>= 200x200 viewport)
- [x] FE-02.d No 50 ms polling
- [x] FE-02.e Robust video id parsing (shorts, live, any parameter order)
- [x] FE-02.f Accessible player controls
- [x] FE-03 Selection survives re-renders; pruned instead of cleared
- [x] FE-04 One global player (context)
- [x] FE-05.1 Sliding sessions (server)
- [x] FE-05.2 Re-login dialog keeps the page and form state
- [x] FE-05.3 Deep links: /login?next=
- [x] FE-05.4 No hard reloads; public pages not redirected
- [x] FE-05.5 Network/5xx not treated as logged out
- [x] FE-05.6 No deprecated onCompleted/onError on queries
- [x] FE-06 <html lang> follows the language
- [x] FE-07 Favourites from server response, optimistic, one hook
- [x] FE-08.1 Errors translated by reason/code
- [x] FE-08.2 Field errors shown next to fields; all modals use it
- [x] FE-09.1 ScoreChart uses resolvedLanguage
- [x] FE-09.2 Nav active on nested routes
- [x] FE-09.3 Collapsible section opens when it gets its first review
- [x] FE-09.4 Filters reset to page 1
- [x] FE-09.5 Score sort can be turned off
- [x] FE-09.6 Score card: unicode file name, artist truncated, configurable URL, roundRect fallback, translated share title
- [x] FE-09.7 CSV: BOM + formula-injection protection
- [x] FE-09.8 Proper empty-password / empty-name messages
- [x] FE-09.9 Not found vs failed to load
- [x] FE-09.10 One YouTube URL validator, same as server
- [x] FE-09.11 AddReviewModal: no default-machine effect loop; artist identified by id; confirm before discarding
- [x] FE-09.12 Render either mobile or desktop list, not both
- [x] FE-09.13 Landing: Button asChild
- [x] FE-09.14 Trend needs enough data
- [x] FE-09.15 Score colour thresholds in one place (per machine)
- [x] FE-09.16 Manifest icons and theme colours consistent

## 9. Frontend organisation
- [x] FO-01.1 Types generated by codegen from schema file
- [x] FO-01.2 Hand-written types and local copies removed
- [x] FO-01.3 Typed documents everywhere
- [x] FO-01.4 Codegen output checked in CI
- [x] FO-01.5 No type policy for missing field
- [x] FO-02.1 AddReviewModal split
- [x] FO-02.2 Shared ReviewFields/ArtistCombobox/SongCombobox/IssuePicker/GenrePicker
- [x] FO-02.3 One MachineSection component
- [x] FO-02.4 Shared review row pieces
- [x] FO-02.5 One avatar helper
- [x] FO-02.6 One downloadBlob
- [x] FO-02.7 Hover state out of the filters hook; memoised ranges
- [x] FO-02.8 ReviewsTable uses the global player; one page-size constant
- [x] FO-02.9 ProtectedRoute not under pages/
- [x] FO-02.10 "@/..." alias used everywhere, also in vitest
- [x] FO-03.1 Unused dependencies removed
- [x] FO-03.2 DELETE_SONG used
- [x] FO-03.3 Unused translation keys pruned + checker script
- [x] FO-03.4 Unused CSS variables removed
- [x] FO-03.5 Unused prop removed
- [x] FO-03.6 Duplicate CSS rule removed
- [x] FO-04.1 ESLint (react-hooks, jsx-a11y)
- [x] FO-04.2 Prettier, consistent formatting
- [x] FO-04.3 legacy-peer-deps removed
- [x] FO-04.4 One icon system
- [x] FO-04.5 Machine colours defined once
- [x] FO-04.6 Dependencies updated within majors; upgrade plan for majors

## 10. Japanese / i18n
- [x] J-01 document lang
- [x] J-02 Japanese font stack (CSS and canvas)
- [x] J-03 Character-based limits (F-09)
- [x] J-04 NFKC + kana-insensitive client matching
- [x] J-05.1 supportedLngs / languageOnly
- [x] J-05.2 No i18n.t outside React render paths that should update
- [x] J-05.3 Server messages translated through codes; OCR notes language
- [x] J-05.4 localeCompare with locale
- [x] J-05.5 Language stored in profile
- [x] J-05.6 Plain language labels (no flags)
- [x] J-06 CSV BOM, unicode file names

## 11. Accessibility and UX
- [x] X-01 Labels connected to inputs
- [x] X-02 Icon buttons named; removable badges are buttons
- [x] X-03 autocomplete attributes
- [x] X-04.1 NavLink / aria-current
- [x] X-04.2 Closed mobile drawer not focusable
- [x] X-04.3 Theme switch available in collapsed sidebar
- [x] X-05.1 Loading skeletons on detail pages; landing not blank
- [x] X-05.2 Error states with retry
- [x] X-05.3 Success reported once
- [x] X-05.4 Import/export in a "Your data" card
- [x] X-05.5 Final confirmation before account deletion
- [x] X-05.6 Rows-per-page selector
- [x] X-05.7 Theme applied before first paint; theme-color follows switch
- [x] X-05.8 No global transition on every element

## 12. Performance
- [x] P-01 Icon font removed
- [~] P-02.1 Vendor chunks — one long-cached `vendor` chunk instead of several: finer groups created import cycles between chunks that crashed React at start-up (found in the browser test). Charts and the HEIC converter stay in on-demand chunks.
- [x] P-02.2 Non-active language loaded lazily
- [x] P-02.3 Chart lazy-loaded
- [x] P-02.4 Landing/Login/Register lazy
- [x] P-03.1 Paginated data (A-03)
- [x] P-03.2 Show cached data while refetching
- [x] P-03.3 Cache updates instead of full refetches
- [~] P-03.4 Artist list not refetched on every dialog open — the picker now shows the cached list immediately and refreshes it in the background (`cache-and-network`); a request is still made when the picker opens, so new artists appear.
- [x] P-04 Rendering (polling, double lists, hover state)
- [x] P-05.1 Query cache, auth cache, no over-fetching
- [x] P-05.2 Pre-compressed assets
- [x] P-05.3 Reload once on chunk load failure

## 13. Tests, CI, tooling
- [x] T-01.1 Handler-level tests against a real database
- [x] T-01.2 ClientIP table tests
- [x] T-01.3 Validator tests with Japanese input
- [x] T-01.4 Presenter / depth-limit tests
- [x] T-01.5 Service tests updated for new behaviour
- [x] T-02 Frontend tests (AddReview manual + OCR, filters, dates, errors, auth routing)
- [x] T-03.1 CI frontend: tests, ESLint, audit
- [x] T-03.2 CI backend: unit and integration separated (Postgres service)
- [x] T-03.3 Docker image build job
- [x] T-03.4 Generated code check
- [x] T-03.5 permissions + concurrency
- [x] T-03.6 Node version consistent
- [x] T-04 Makefile (seed via compose, test/lint both, dev, codegen, migration targets)
- [x] T-05 .gitignore `/server`
- [x] T-06 Dependabot + govulncheck

## 14. Docker, nginx, configuration
- [x] I-01.1 Backend port not published
- [x] I-01.2 Umami build args passed
- [x] I-01.3 APP_ENV production by default
- [x] I-02.1 nginx resolves backend dynamically, resolver configurable
- [x] I-02.2 Local nginx health endpoint
- [x] I-02.3 Security headers in one include
- [x] I-02.4 Body size consistent
- [x] I-02.5 Compression (pre-compressed)
- [x] I-02.6 Forwarded headers (S-01)
- [x] I-03.1 Current Go patch image; distroless runtime with -healthcheck
- [x] I-03.2 .dockerignore excludes tests/seed
- [x] I-03.3 Frontend build args documented
- [x] I-04.1 Env files documented, secret generation
- [x] I-04.2 Several CORS origins
- [x] I-05.1 Seed password follows the policy; warning
- [x] I-05.2 Seed dates relative to now
- [x] I-05.3 Seed matches the new schema

## 15. Documentation
- [x] DOC-01.1 Frontend README accurate
- [x] DOC-01.2 Backend README accurate (codegen, tests)
- [x] DOC-01.3 Root README (Node, env vars, optional features, deployment)
- [x] DOC-01.4 Architecture / contributing note
- [x] DOC-01.5 LICENSE note in README
- [x] DOC-01.6 SECURITY supported versions

## 16. Features
- [x] FEAT-01 Delete song/artist
- [x] FEAT-02 Password reset + e-mail verification
- [x] FEAT-03 Add review from song and artist pages
- [x] FEAT-04 Key change per review
- [x] FEAT-05 Score breakdown stored and charted
- [x] FEAT-06 Capability flags
- [x] FEAT-07 Sliding sessions + log out everywhere
- [x] FEAT-08 CSV import + versioned export
- [x] FEAT-09 Global player + practice queue from favourites
- [x] FEAT-10 Goals, personal bests, PB badge
- [x] FEAT-11 Language in profile
- [x] FEAT-12 PWA service worker + camera capture
- [x] FEAT-13 Admin removed

## 17. K-STAGE
- [x] K-01 Machine registry in the frontend
- [x] K-02 Generic machineStats in the API
- [x] K-03 KSTAGE machine added (enum, DB, OCR, locales)
- [x] K-04 Variant field
- [x] K-05 Per-machine colour bands
- [x] K-06 UI layouts for 3+ machines (machine picker, profile, dashboard cards)
- [x] K-07 "How to add a machine" documentation

## 18. Added after the review

- [x] SHARE-01 Web Share Target: `share_target` in the manifest (POST, multipart, image files); the service worker keeps the image and opens "Log a take" with it attached; nginx fallback when no service worker is active yet
- [x] SHARE-02 Photo field shows the attachment (preview, name, size, read, remove); size and feature checks
- [x] SHARE-03 HEIC/HEIF photos converted to JPEG in the browser (on-demand chunk, CSP `wasm-unsafe-eval` and `worker-src blob:`); licence note in docs/upgrades.md
- [x] FIX-01 `Intl`/`localeCompare` never receive the raw browser language (an `en-US@posix` locale crashed the songs page)
- [x] FIX-02 Re-login dialog focuses the password when the address is known
- [x] DOC-02 docs/upgrades.md: plan for major dependency upgrades (FO-04.6)

