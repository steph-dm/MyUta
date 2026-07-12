-- +goose Up
-- Accounts previously marked as deleted were promised permanent deletion.
DELETE FROM users WHERE "deletedAt" IS NOT NULL;

DROP INDEX IF EXISTS idx_users_name_unique;
ALTER TABLE users DROP COLUMN IF EXISTS birthdate;
ALTER TABLE users DROP COLUMN IF EXISTS "deletedAt";
CREATE UNIQUE INDEX idx_users_name_unique ON users (name) WHERE name IS NOT NULL;

-- +goose Down
DROP INDEX IF EXISTS idx_users_name_unique;
ALTER TABLE users ADD COLUMN birthdate TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE users ADD COLUMN "deletedAt" TIMESTAMPTZ;
CREATE UNIQUE INDEX idx_users_name_unique ON users (name) WHERE name IS NOT NULL AND "deletedAt" IS NULL;
