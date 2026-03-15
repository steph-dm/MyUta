-- +goose Up
CREATE TABLE IF NOT EXISTS users (
	id                   VARCHAR PRIMARY KEY,
	email                VARCHAR NOT NULL UNIQUE,
	name                 VARCHAR,
	password             VARCHAR NOT NULL,
	birthdate            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	"isAdmin"            BOOLEAN NOT NULL DEFAULT FALSE,
	"defaultMachineType" VARCHAR,
	"passwordChangedAt"  TIMESTAMPTZ,
	"deletedAt"          TIMESTAMPTZ,
	"createdAt"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	"updatedAt"          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS artists (
	id          VARCHAR PRIMARY KEY,
	name        VARCHAR NOT NULL,
	"userId"    VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	"createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	"updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS songs (
	id                  VARCHAR PRIMARY KEY,
	title               VARCHAR NOT NULL,
	"artistId"          VARCHAR NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
	"userId"            VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	genres              TEXT[] NOT NULL DEFAULT '{}',
	"youtubeUrl"        VARCHAR,
	"generatedYoutube"  BOOLEAN NOT NULL DEFAULT FALSE,
	"createdAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	"updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reviews (
	id              VARCHAR PRIMARY KEY,
	date            TIMESTAMPTZ NOT NULL,
	"userId"        VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	"songId"        VARCHAR NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
	score           DOUBLE PRECISION NOT NULL,
	"machineType"   VARCHAR NOT NULL,
	issues          TEXT[] NOT NULL DEFAULT '{}',
	notes           VARCHAR,
	"createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	"updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS favorite_songs (
	id          VARCHAR PRIMARY KEY,
	"userId"    VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	"songId"    VARCHAR NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
	"createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	UNIQUE ("userId", "songId")
);

CREATE TABLE IF NOT EXISTS favorite_artists (
	id          VARCHAR PRIMARY KEY,
	"userId"    VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	"artistId"  VARCHAR NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
	"createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	UNIQUE ("userId", "artistId")
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews ("userId");
CREATE INDEX IF NOT EXISTS idx_reviews_song_id ON reviews ("songId");
CREATE INDEX IF NOT EXISTS idx_songs_artist_id ON songs ("artistId");
CREATE INDEX IF NOT EXISTS idx_reviews_date ON reviews (date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_name_unique ON users (name) WHERE name IS NOT NULL AND "deletedAt" IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_songs_artist_title ON songs ("artistId", lower(title));
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_user_song_date ON reviews ("userId", "songId", date);

-- +goose Down
DROP TABLE IF EXISTS favorite_artists;
DROP TABLE IF EXISTS favorite_songs;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS songs;
DROP TABLE IF EXISTS artists;
DROP TABLE IF EXISTS users;
