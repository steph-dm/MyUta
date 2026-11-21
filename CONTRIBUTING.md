# Contributing

1. Set up the project as described in the README (Go 1.26, Node 22 with npm 11, Docker).
2. Create a branch, make the change, and run `make check` (codegen, linters, tests).
   Backend changes that touch the database also need `make test-integration`.
3. Open a pull request. CI must be green.

## Conventions

- **Schema first.** Change `backend/schema.graphql`, run `make codegen`, then implement the
  resolver (backend) and use the generated types (frontend `src/gql`). CI fails when generated
  code is out of date.
- **Migrations** are append-only: `cd backend && go run ./cmd/migrate create <name>`. Never edit
  a migration that has been released. Write a `-- +goose Down` section, or raise an exception
  in it when the change cannot be undone.
- **Errors** carry `extensions.code` and a stable `extensions.reason` (`internal/apperror`).
  The frontend translates by reason (`common:errors.reasons.*`); never show or parse server
  messages in the UI.
- **Translations:** add every key to both `en` and `ja`; `npm run check:i18n` checks parity,
  placeholders and keys used in the code.
- **Machines** are defined in one place per side; see `docs/adding-a-machine.md`.
- Format: `gofmt`/`goimports` (golangci-lint) and Prettier (`npm run format`).
