# Adding a karaoke machine

Scores of different machines are never mixed: every take, goal, statistic and chart is per
machine. Adding one (as K-STAGE was added in 2.0) takes these steps.

## 1. Database

Machines are rows in `machine_types`, referenced by foreign keys. Add a migration:

```bash
cd backend && go run ./cmd/migrate create add_machine_<code>
```

```sql
-- +goose Up
INSERT INTO machine_types (code, label, kind, sort_order) VALUES ('NEWCODE', 'Display name', 'venue', 40);
-- +goose Down
DELETE FROM machine_types WHERE code = 'NEWCODE';
```

`kind` is `venue` (a machine in a karaoke box) or `home` (an app or browser game).

## 2. Backend

- `backend/schema.graphql`: add `NEWCODE` to `enum MachineType`.
- `backend/internal/domain/domain.go`: add the constant and its entry in `Machines`
  (label, kind). `IsValid`, validation, CSV import and OCR use this list.
- `backend/internal/ocr`: the prompt lists the machines from the registry. Describe how the
  result screen can be recognised if it is not obvious.
- Run `make codegen` and `go test ./...` (`TestRegistries` counts the entries).

## 3. Frontend

- `npm run codegen` adds the value to the `MachineType` type; TypeScript then requires an
  entry in `frontend/src/lib/machines.ts` (`MACHINES`): label, short label, colours (complete
  Tailwind class strings), chart colour and score bands. Bands are the "great/good/ok"
  thresholds for that machine's scale (K-STAGE uses lower bands than DAM).
- Everything else (pickers, sections, badges, charts, dashboard cards, score card) reads the
  registry.

## 4. Check

`make check`, then log a take on the new machine and look at the dashboard, a song page and
the score card.
