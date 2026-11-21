-- +goose Up
CREATE INDEX IF NOT EXISTS idx_songs_user_id ON songs ("userId");
CREATE INDEX IF NOT EXISTS idx_artists_user_id ON artists ("userId");
CREATE INDEX IF NOT EXISTS idx_reviews_user_date ON reviews ("userId", date DESC);
CREATE INDEX IF NOT EXISTS idx_favorite_songs_user ON favorite_songs ("userId");
CREATE INDEX IF NOT EXISTS idx_favorite_artists_user ON favorite_artists ("userId");

-- +goose Down
DROP INDEX IF EXISTS idx_favorite_artists_user;
DROP INDEX IF EXISTS idx_favorite_songs_user;
DROP INDEX IF EXISTS idx_reviews_user_date;
DROP INDEX IF EXISTS idx_artists_user_id;
DROP INDEX IF EXISTS idx_songs_user_id;
