-- +goose Up
-- Accounts previously marked as deleted were promised permanent deletion.
-- +goose StatementBegin
DO $$
DECLARE removed integer;
BEGIN
  DELETE FROM users WHERE "deletedAt" IS NOT NULL;
  GET DIAGNOSTICS removed = ROW_COUNT;
  RAISE NOTICE '003: permanently deleted % soft-deleted account(s)', removed;
END $$;
-- +goose StatementEnd

DROP INDEX IF EXISTS idx_users_name_unique;
ALTER TABLE users DROP COLUMN IF EXISTS birthdate;
ALTER TABLE users DROP COLUMN IF EXISTS "deletedAt";
CREATE UNIQUE INDEX idx_users_name_unique ON users (name) WHERE name IS NOT NULL;

-- +goose Down
DROP INDEX IF EXISTS idx_users_name_unique;
-- The original values are gone; the column comes back empty.
ALTER TABLE users ADD COLUMN birthdate TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN "deletedAt" TIMESTAMPTZ;
CREATE UNIQUE INDEX idx_users_name_unique ON users (name) WHERE name IS NOT NULL AND "deletedAt" IS NULL;
