# Dependency upgrade plan

Minor and patch releases are kept current (Dependabot opens grouped pull requests every week;
CI must pass). Major versions are planned here, one at a time, each in its own pull request.
Status as of 2.0 (November 2026).

## Frontend

| Package | Now | Latest | Plan |
| --- | --- | --- | --- |
| `@apollo/client` | 3.14 | 4.x | Largest change (new error classes, `onError` link API, React hooks moved, RxJS). Do first, alone. `lib/errors.ts` and `lib/apollo.ts` hold almost all Apollo-specific code; afterwards `apollo-upload-client` 20 could replace `lib/upload.ts`. |
| `graphql` | 16 | 17 | Together with Apollo 4 and graphql-codegen (they need to agree). |
| `vite`, `@vitejs/plugin-react`, `vitest` | 7 / 5 / 4 | 8 / 6 / 5 | Together. Re-check `manualChunks` (one vendor chunk, see vite.config.ts) and the `?raw` import in the service-worker test. |
| `tailwindcss` | 3.4 | 4.x | CSS-first configuration; migrate `tailwind.config.cjs` with the official upgrade tool, then check dark mode and the shadcn components visually. |
| `eslint`, `@eslint/js` | 9 | 10 | Blocked until `eslint-plugin-jsx-a11y` supports ESLint 10. |
| `typescript` | 5.9 | 7.x | After the tools above support it (typescript-eslint range is `<6.1`). |
| `i18next`, `react-i18next` | 25 / 16 | 27 / 18 | Together; check the custom lazy backend in `src/i18n/index.ts`. |
| `lucide-react` | 0.563 | 1.x | Icon renames; the build fails on missing icons, so it is safe to try. |
| `jsdom`, `@testing-library/jest-dom`, `@types/node` | | | Test-only; with the Vitest upgrade. |

npm itself must stay on 11+ (npm 10 crashes on vitest's optional peer dependencies).

## Backend

Go modules are on current versions within their majors (`go list -m -u all` with network
access). Go itself follows the newest patch release of 1.26 (Docker image and `go.mod`).
Before the next upgrade round, run `go mod tidy` once with network access: the 2.0 rewrite
removed testcontainers, and the sandbox it was written in could not reach every module
proxy, so `go.mod` was edited by hand (CI checks that it is tidy).

## Third-party licences

`heic-to` (HEIC photo conversion, loaded only when a HEIC photo is attached) bundles libheif
and is licensed **LGPL-3.0**. It is shipped unmodified as its own JavaScript chunk, so it can
be replaced independently. Check that this fits the project's licence before distributing
the app; the alternative is to remove HEIC conversion (see `src/lib/heic.ts`) and ask users
to share screenshots instead.
