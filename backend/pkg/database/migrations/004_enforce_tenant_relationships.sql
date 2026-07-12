-- +goose Up
DELETE FROM songs s
USING artists a
WHERE s."artistId" = a.id AND s."userId" <> a."userId";
DELETE FROM reviews r
USING songs s
WHERE r."songId" = s.id AND r."userId" <> s."userId";
DELETE FROM favorite_songs f
USING songs s
WHERE f."songId" = s.id AND f."userId" <> s."userId";
DELETE FROM favorite_artists f
USING artists a
WHERE f."artistId" = a.id AND f."userId" <> a."userId";

ALTER TABLE artists
  ADD CONSTRAINT artists_id_user_id_unique UNIQUE (id, "userId");
ALTER TABLE songs
  ADD CONSTRAINT songs_id_user_id_unique UNIQUE (id, "userId");

ALTER TABLE songs
  ADD CONSTRAINT songs_artist_user_fkey
  FOREIGN KEY ("artistId", "userId") REFERENCES artists (id, "userId") ON DELETE CASCADE;
ALTER TABLE reviews
  ADD CONSTRAINT reviews_song_user_fkey
  FOREIGN KEY ("songId", "userId") REFERENCES songs (id, "userId") ON DELETE CASCADE;
ALTER TABLE favorite_songs
  ADD CONSTRAINT favorite_songs_song_user_fkey
  FOREIGN KEY ("songId", "userId") REFERENCES songs (id, "userId") ON DELETE CASCADE;
ALTER TABLE favorite_artists
  ADD CONSTRAINT favorite_artists_artist_user_fkey
  FOREIGN KEY ("artistId", "userId") REFERENCES artists (id, "userId") ON DELETE CASCADE;

-- +goose Down
ALTER TABLE favorite_artists DROP CONSTRAINT IF EXISTS favorite_artists_artist_user_fkey;
ALTER TABLE favorite_songs DROP CONSTRAINT IF EXISTS favorite_songs_song_user_fkey;
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_song_user_fkey;
ALTER TABLE songs DROP CONSTRAINT IF EXISTS songs_artist_user_fkey;
ALTER TABLE songs DROP CONSTRAINT IF EXISTS songs_id_user_id_unique;
ALTER TABLE artists DROP CONSTRAINT IF EXISTS artists_id_user_id_unique;
