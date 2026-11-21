-- +goose Up
-- MyUta schema v2.
--
-- Converts the existing data in place; nothing is dropped except columns that
-- are no longer used (users.isAdmin, users.passwordChangedAt) and rows that are
-- exact duplicates after name normalisation (they are merged first, see step 7).
--
-- Summary of changes
--   * camelCase columns -> snake_case; VARCHAR ids -> uuid
--   * reviews.date (TIMESTAMPTZ) -> reviews.performed_on (DATE, the day chosen in the UI)
--   * reviews.score DOUBLE -> NUMERIC(6,3) with 0..100 check
--   * reviews: key_change, variant, details (score breakdown)
--   * machine_types reference table (DAM, JOYSOUND, KSTAGE)
--   * e-mails lower-cased, user names required, global name uniqueness dropped
--   * normalised name/title keys (NFKC, case, spaces) with unique indexes
--   * one-review-per-song-per-day restriction removed
--   * sessions, auth_tokens (password reset / e-mail verification), song_goals
--   * updated_at maintained by a trigger
-- The whole migration runs in one transaction: it either applies completely or not at all.

-- 0. Sanity checks that would otherwise fail half-way with an obscure error --------------
-- +goose StatementBegin
DO $$
DECLARE bad text;
BEGIN
  IF current_setting('server_encoding') <> 'UTF8' THEN
    RAISE EXCEPTION '005: database encoding must be UTF8 (is %)', current_setting('server_encoding');
  END IF;

  SELECT string_agg(id, ', ') INTO bad FROM (
    SELECT id FROM users   UNION ALL SELECT id FROM artists UNION ALL
    SELECT id FROM songs   UNION ALL SELECT id FROM reviews
  ) ids WHERE id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION '005: these ids are not UUIDs and cannot be converted: %', bad;
  END IF;

  SELECT string_agg(e, ', ') INTO bad FROM (
    SELECT lower(btrim(email)) AS e FROM users GROUP BY 1 HAVING count(*) > 1
  ) d;
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION '005: several accounts use the same e-mail address in different letter case: %. '
                    'Keep one account per address (delete or rename the others), then run the migration again.', bad;
  END IF;

  SELECT string_agg(DISTINCT "machineType", ', ') INTO bad FROM reviews
   WHERE "machineType" NOT IN ('DAM', 'JOYSOUND', 'KSTAGE');
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION '005: unknown machine types in reviews: %', bad;
  END IF;
END $$;
-- +goose StatementEnd

-- 1. Drop foreign keys and the constraints they depend on (re-created in step 10) -----------
ALTER TABLE artists DROP CONSTRAINT IF EXISTS "artists_userId_fkey";
ALTER TABLE songs DROP CONSTRAINT IF EXISTS "songs_userId_fkey",
                  DROP CONSTRAINT IF EXISTS "songs_artistId_fkey",
                  DROP CONSTRAINT IF EXISTS songs_artist_user_fkey;
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS "reviews_userId_fkey",
                    DROP CONSTRAINT IF EXISTS "reviews_songId_fkey",
                    DROP CONSTRAINT IF EXISTS reviews_song_user_fkey;
ALTER TABLE favorite_songs DROP CONSTRAINT IF EXISTS "favorite_songs_userId_fkey",
                           DROP CONSTRAINT IF EXISTS "favorite_songs_songId_fkey",
                           DROP CONSTRAINT IF EXISTS favorite_songs_song_user_fkey;
ALTER TABLE favorite_artists DROP CONSTRAINT IF EXISTS "favorite_artists_userId_fkey",
                             DROP CONSTRAINT IF EXISTS "favorite_artists_artistId_fkey",
                             DROP CONSTRAINT IF EXISTS favorite_artists_artist_user_fkey;
ALTER TABLE artists DROP CONSTRAINT IF EXISTS artists_id_user_id_unique;
ALTER TABLE songs DROP CONSTRAINT IF EXISTS songs_id_user_id_unique;

-- 2. Drop indexes that are redundant or replaced ---------------------------------------------
DROP INDEX IF EXISTS idx_reviews_user_song_date;  -- blocked several takes per day
DROP INDEX IF EXISTS idx_reviews_user_id;
DROP INDEX IF EXISTS idx_reviews_song_id;
DROP INDEX IF EXISTS idx_reviews_date;
DROP INDEX IF EXISTS idx_reviews_user_date;
DROP INDEX IF EXISTS idx_songs_artist_id;
DROP INDEX IF EXISTS idx_songs_artist_title;
DROP INDEX IF EXISTS idx_songs_user_id;
DROP INDEX IF EXISTS idx_artists_user_id;
DROP INDEX IF EXISTS idx_users_name_unique;
DROP INDEX IF EXISTS idx_favorite_songs_user;
DROP INDEX IF EXISTS idx_favorite_artists_user;

-- 3. Favourite tables: the pair becomes the primary key --------------------------------------
ALTER TABLE favorite_songs DROP CONSTRAINT IF EXISTS favorite_songs_pkey,
                           DROP CONSTRAINT IF EXISTS "favorite_songs_userId_songId_key",
                           DROP COLUMN id;
ALTER TABLE favorite_artists DROP CONSTRAINT IF EXISTS favorite_artists_pkey,
                             DROP CONSTRAINT IF EXISTS "favorite_artists_userId_artistId_key",
                             DROP COLUMN id;

-- 4. snake_case -------------------------------------------------------------------------------
ALTER TABLE users RENAME COLUMN "isAdmin" TO is_admin;
ALTER TABLE users RENAME COLUMN "defaultMachineType" TO default_machine_type;
ALTER TABLE users RENAME COLUMN "passwordChangedAt" TO password_changed_at;
ALTER TABLE users RENAME COLUMN password TO password_hash;
ALTER TABLE users RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE users RENAME COLUMN "updatedAt" TO updated_at;

ALTER TABLE artists RENAME COLUMN "userId" TO user_id;
ALTER TABLE artists RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE artists RENAME COLUMN "updatedAt" TO updated_at;

ALTER TABLE songs RENAME COLUMN "artistId" TO artist_id;
ALTER TABLE songs RENAME COLUMN "userId" TO user_id;
ALTER TABLE songs RENAME COLUMN "youtubeUrl" TO youtube_url;
ALTER TABLE songs RENAME COLUMN "generatedYoutube" TO generated_youtube;
ALTER TABLE songs RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE songs RENAME COLUMN "updatedAt" TO updated_at;

ALTER TABLE reviews RENAME COLUMN date TO performed_on;
ALTER TABLE reviews RENAME COLUMN "userId" TO user_id;
ALTER TABLE reviews RENAME COLUMN "songId" TO song_id;
ALTER TABLE reviews RENAME COLUMN "machineType" TO machine_type;
ALTER TABLE reviews RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE reviews RENAME COLUMN "updatedAt" TO updated_at;

ALTER TABLE favorite_songs RENAME COLUMN "userId" TO user_id;
ALTER TABLE favorite_songs RENAME COLUMN "songId" TO song_id;
ALTER TABLE favorite_songs RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE favorite_artists RENAME COLUMN "userId" TO user_id;
ALTER TABLE favorite_artists RENAME COLUMN "artistId" TO artist_id;
ALTER TABLE favorite_artists RENAME COLUMN "createdAt" TO created_at;

-- 5. uuid ids -----------------------------------------------------------------------------------
ALTER TABLE users   ALTER COLUMN id TYPE uuid USING id::uuid, ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE artists ALTER COLUMN id TYPE uuid USING id::uuid, ALTER COLUMN id SET DEFAULT gen_random_uuid(),
                    ALTER COLUMN user_id TYPE uuid USING user_id::uuid;
ALTER TABLE songs   ALTER COLUMN id TYPE uuid USING id::uuid, ALTER COLUMN id SET DEFAULT gen_random_uuid(),
                    ALTER COLUMN user_id TYPE uuid USING user_id::uuid,
                    ALTER COLUMN artist_id TYPE uuid USING artist_id::uuid;
ALTER TABLE reviews ALTER COLUMN id TYPE uuid USING id::uuid, ALTER COLUMN id SET DEFAULT gen_random_uuid(),
                    ALTER COLUMN user_id TYPE uuid USING user_id::uuid,
                    ALTER COLUMN song_id TYPE uuid USING song_id::uuid;
ALTER TABLE favorite_songs   ALTER COLUMN user_id TYPE uuid USING user_id::uuid,
                             ALTER COLUMN song_id TYPE uuid USING song_id::uuid;
ALTER TABLE favorite_artists ALTER COLUMN user_id TYPE uuid USING user_id::uuid,
                             ALTER COLUMN artist_id TYPE uuid USING artist_id::uuid;

-- 6. users ---------------------------------------------------------------------------------------
UPDATE users SET email = lower(btrim(email)) WHERE email <> lower(btrim(email));
ALTER TABLE users ADD CONSTRAINT users_email_lowercase CHECK (email = lower(btrim(email)));
UPDATE users SET name = 'singer-' || left(id::text, 8) WHERE name IS NULL OR btrim(name) = '';
UPDATE users SET name = btrim(name) WHERE name <> btrim(name);
ALTER TABLE users ALTER COLUMN name SET NOT NULL;
ALTER TABLE users DROP COLUMN is_admin, DROP COLUMN password_changed_at;
ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMPTZ,
                  ADD COLUMN language VARCHAR(5),
                  ADD CONSTRAINT users_language_check CHECK (language IS NULL OR language IN ('en', 'ja'));

CREATE TABLE machine_types (
  code       VARCHAR(20) PRIMARY KEY,
  label      VARCHAR(50) NOT NULL,
  kind       VARCHAR(10) NOT NULL CHECK (kind IN ('venue', 'home')),
  sort_order INT NOT NULL
);
INSERT INTO machine_types (code, label, kind, sort_order) VALUES
  ('DAM', 'DAM', 'venue', 1),
  ('JOYSOUND', 'JOYSOUND', 'venue', 2),
  ('KSTAGE', 'K-STAGE', 'home', 3);
UPDATE users SET default_machine_type = NULL
 WHERE default_machine_type IS NOT NULL
   AND default_machine_type NOT IN (SELECT code FROM machine_types);

-- 7. Normalised keys for names and titles, merging duplicates ------------------------------
-- NFKC folds full-width letters (ＹＯＡＳＯＢＩ -> YOASOBI); then spaces are collapsed and
-- the text is lower-cased. The Go code uses the same rules (domain.NormalizeKey).
-- +goose StatementBegin
CREATE FUNCTION myuta_key(t text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE
  AS $$ SELECT lower(btrim(regexp_replace(normalize(t, NFKC), '\s+', ' ', 'g'))) $$;
-- +goose StatementEnd

-- Search additionally ignores the hiragana/katakana difference (あいどる finds アイドル).
-- +goose StatementBegin
CREATE FUNCTION myuta_search_key(t text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE
  AS $$ SELECT translate(myuta_key(t), 'ァアィイゥウェエォオカガキギクグケゲコゴサザシジスズセゼソゾタダチヂッツヅテデトドナニヌネノハバパヒビピフブプヘベペホボポマミムメモャヤュユョヨラリルレロヮワヰヱヲンヴヵヶ', 'ぁあぃいぅうぇえぉおかがきぎくぐけげこごさざしじすずせぜそぞただちぢっつづてでとどなにぬねのはばぱひびぴふぶぷへべぺほぼぽまみむめもゃやゅゆょよらりるれろゎわゐゑをんゔゕゖ') $$;
-- +goose StatementEnd

ALTER TABLE artists ADD COLUMN name_key TEXT GENERATED ALWAYS AS (myuta_key(name)) STORED;
ALTER TABLE songs   ADD COLUMN title_key TEXT GENERATED ALWAYS AS (myuta_key(title)) STORED;

-- +goose StatementBegin
DO $$
DECLARE n integer;
BEGIN
  -- Artists: keep the oldest row of each (user, normalised name) group.
  CREATE TEMP TABLE artist_merge ON COMMIT DROP AS
  SELECT a.id AS dup_id, k.keep_id
    FROM artists a
    JOIN (SELECT DISTINCT ON (user_id, name_key) user_id, name_key, id AS keep_id
            FROM artists ORDER BY user_id, name_key, created_at, id) k
      USING (user_id, name_key)
   WHERE a.id <> k.keep_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE '005: merging % duplicate artist(s)', n;

  UPDATE songs s SET artist_id = m.keep_id FROM artist_merge m WHERE s.artist_id = m.dup_id;
  INSERT INTO favorite_artists (user_id, artist_id, created_at)
  SELECT f.user_id, m.keep_id, f.created_at
    FROM favorite_artists f JOIN artist_merge m ON f.artist_id = m.dup_id
  ON CONFLICT DO NOTHING;
  DELETE FROM favorite_artists f USING artist_merge m WHERE f.artist_id = m.dup_id;
  -- favourites may now contain the same pair twice; keep one
  DELETE FROM favorite_artists f USING favorite_artists g
   WHERE f.user_id = g.user_id AND f.artist_id = g.artist_id AND f.ctid > g.ctid;
  DELETE FROM artists a USING artist_merge m WHERE a.id = m.dup_id;

  -- Songs: same per (artist, normalised title), after the artist merge.
  CREATE TEMP TABLE song_merge ON COMMIT DROP AS
  SELECT s.id AS dup_id, k.keep_id
    FROM songs s
    JOIN (SELECT DISTINCT ON (artist_id, title_key) artist_id, title_key, id AS keep_id
            FROM songs ORDER BY artist_id, title_key, created_at, id) k
      USING (artist_id, title_key)
   WHERE s.id <> k.keep_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE '005: merging % duplicate song(s)', n;

  UPDATE songs k SET
    genres = COALESCE((SELECT array_agg(DISTINCT g ORDER BY g)
                         FROM songs s2, unnest(s2.genres) g
                        WHERE s2.id = k.id
                           OR s2.id IN (SELECT dup_id FROM song_merge WHERE keep_id = k.id)), '{}'),
    youtube_url = COALESCE(k.youtube_url,
                           (SELECT d.youtube_url FROM songs d JOIN song_merge m ON d.id = m.dup_id
                             WHERE m.keep_id = k.id AND d.youtube_url IS NOT NULL LIMIT 1))
   WHERE k.id IN (SELECT keep_id FROM song_merge);
  UPDATE reviews r SET song_id = m.keep_id FROM song_merge m WHERE r.song_id = m.dup_id;
  INSERT INTO favorite_songs (user_id, song_id, created_at)
  SELECT f.user_id, m.keep_id, f.created_at
    FROM favorite_songs f JOIN song_merge m ON f.song_id = m.dup_id
  ON CONFLICT DO NOTHING;
  DELETE FROM favorite_songs f USING song_merge m WHERE f.song_id = m.dup_id;
  DELETE FROM favorite_songs f USING favorite_songs g
   WHERE f.user_id = g.user_id AND f.song_id = g.song_id AND f.ctid > g.ctid;
  DELETE FROM songs s USING song_merge m WHERE s.id = m.dup_id;
END $$;
-- +goose StatementEnd

-- 8. reviews -------------------------------------------------------------------------------------
-- The old UI stored the chosen day at 00:00 UTC and displayed the UTC calendar day, so the
-- UTC date is exactly what users saw.
ALTER TABLE reviews ALTER COLUMN performed_on TYPE DATE USING (performed_on AT TIME ZONE 'UTC')::date;
ALTER TABLE reviews ALTER COLUMN score TYPE NUMERIC(6,3) USING round(score::numeric, 3);
ALTER TABLE reviews ADD CONSTRAINT reviews_score_range CHECK (score >= 0 AND score <= 100);
ALTER TABLE reviews ALTER COLUMN machine_type TYPE VARCHAR(20);
ALTER TABLE reviews ADD COLUMN key_change SMALLINT NOT NULL DEFAULT 0
                      CONSTRAINT reviews_key_change_range CHECK (key_change BETWEEN -12 AND 12),
                    ADD COLUMN variant VARCHAR(100),
                    ADD COLUMN details JSONB;
UPDATE reviews SET issues = ARRAY(SELECT DISTINCT unnest(issues) ORDER BY 1)
 WHERE cardinality(issues) <> (SELECT count(DISTINCT x) FROM unnest(issues) x);
UPDATE reviews SET notes = NULLIF(btrim(notes), '') WHERE notes IS NOT NULL AND notes <> btrim(notes);

-- 9. Favourite primary keys ----------------------------------------------------------------------
ALTER TABLE favorite_songs ADD PRIMARY KEY (user_id, song_id);
ALTER TABLE favorite_artists ADD PRIMARY KEY (user_id, artist_id);

-- 10. Keys and foreign keys (only the composite tenant keys + user cascades) ---------------------
ALTER TABLE artists ADD CONSTRAINT artists_id_user_unique UNIQUE (id, user_id),
                    ADD CONSTRAINT artists_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;
ALTER TABLE songs ADD CONSTRAINT songs_id_user_unique UNIQUE (id, user_id),
                  ADD CONSTRAINT songs_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                  ADD CONSTRAINT songs_artist_fk FOREIGN KEY (artist_id, user_id)
                      REFERENCES artists (id, user_id) ON DELETE CASCADE;
ALTER TABLE reviews ADD CONSTRAINT reviews_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                    ADD CONSTRAINT reviews_song_fk FOREIGN KEY (song_id, user_id)
                        REFERENCES songs (id, user_id) ON DELETE CASCADE,
                    ADD CONSTRAINT reviews_machine_fk FOREIGN KEY (machine_type) REFERENCES machine_types (code);
ALTER TABLE favorite_songs ADD CONSTRAINT favorite_songs_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                           ADD CONSTRAINT favorite_songs_song_fk FOREIGN KEY (song_id, user_id)
                               REFERENCES songs (id, user_id) ON DELETE CASCADE;
ALTER TABLE favorite_artists ADD CONSTRAINT favorite_artists_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                             ADD CONSTRAINT favorite_artists_artist_fk FOREIGN KEY (artist_id, user_id)
                                 REFERENCES artists (id, user_id) ON DELETE CASCADE;
ALTER TABLE users ALTER COLUMN default_machine_type TYPE VARCHAR(20),
                  ADD CONSTRAINT users_machine_fk FOREIGN KEY (default_machine_type)
                      REFERENCES machine_types (code) ON DELETE SET NULL;

-- 11. New tables -----------------------------------------------------------------------------------
CREATE TABLE sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL,
  user_agent   VARCHAR(300)
);
CREATE INDEX sessions_user_idx ON sessions (user_id);
CREATE INDEX sessions_expires_idx ON sessions (expires_at);

CREATE TABLE auth_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  purpose    VARCHAR(20) NOT NULL CHECK (purpose IN ('password_reset', 'email_verify')),
  token_hash BYTEA NOT NULL UNIQUE,
  new_email  VARCHAR,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX auth_tokens_user_idx ON auth_tokens (user_id, purpose);

CREATE TABLE song_goals (
  song_id      UUID NOT NULL,
  user_id      UUID NOT NULL,
  machine_type VARCHAR(20) NOT NULL REFERENCES machine_types (code),
  target_score NUMERIC(6,3) NOT NULL CHECK (target_score > 0 AND target_score <= 100),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (song_id, machine_type),
  FOREIGN KEY (song_id, user_id) REFERENCES songs (id, user_id) ON DELETE CASCADE
);

-- 12. Indexes ----------------------------------------------------------------------------------------
CREATE UNIQUE INDEX artists_user_name_key ON artists (user_id, name_key);
CREATE UNIQUE INDEX songs_artist_title_key ON songs (artist_id, title_key);
CREATE INDEX songs_user_title_idx ON songs (user_id, title_key);
CREATE INDEX reviews_user_date_idx ON reviews (user_id, performed_on DESC, created_at DESC);
CREATE INDEX reviews_song_machine_idx ON reviews (song_id, machine_type, performed_on DESC);

-- 13. updated_at is maintained by the database only ---------------------------------------------------
-- +goose StatementBegin
CREATE FUNCTION myuta_set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;
-- +goose StatementEnd
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION myuta_set_updated_at();
CREATE TRIGGER artists_updated_at BEFORE UPDATE ON artists FOR EACH ROW EXECUTE FUNCTION myuta_set_updated_at();
CREATE TRIGGER songs_updated_at BEFORE UPDATE ON songs FOR EACH ROW EXECUTE FUNCTION myuta_set_updated_at();
CREATE TRIGGER reviews_updated_at BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION myuta_set_updated_at();
CREATE TRIGGER song_goals_updated_at BEFORE UPDATE ON song_goals FOR EACH ROW EXECUTE FUNCTION myuta_set_updated_at();

-- +goose Down
-- +goose StatementBegin
DO $$
BEGIN
  RAISE EXCEPTION '005 cannot be reverted automatically (types, merged rows and dropped columns). '
                  'Restore the backup taken before the upgrade instead.';
END $$;
-- +goose StatementEnd
