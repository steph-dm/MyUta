import { Link } from "react-router-dom";
import { useQuery } from "@apollo/client";
import { useTranslation } from "react-i18next";
import { Heart, ListMusic } from "lucide-react";
import { FAVORITES } from "@/graphql/library";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FavoriteButton, ListSkeleton, PlayButton } from "@/components/shared";
import { usePlayer } from "@/contexts/PlayerContext";
import { useFavorite } from "@/hooks/useFavorite";
import { videoId } from "@/lib/youtube";

/** Favourite songs and artists; "Play favourites" plays all songs with a link in order. */
export default function FavoritesCard() {
  const { t } = useTranslation("profile");
  const { data, loading } = useQuery(FAVORITES);
  const favorite = useFavorite();
  const player = usePlayer();
  const songs = data?.myFavoriteSongs ?? [];
  const artists = data?.myFavoriteArtists ?? [];
  const playable = songs.filter((s) => videoId(s.youtubeUrl));

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <Heart className="h-5 w-5" aria-hidden="true" /> {t("favorites.title")}
          </CardTitle>
          <CardDescription>{t("favorites.songs", { count: songs.length })}</CardDescription>
        </div>
        {playable.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() =>
              player.playAll(
                playable.map((s) => ({
                  url: s.youtubeUrl!,
                  title: s.title,
                  artist: s.artist.name,
                })),
              )
            }
          >
            <ListMusic className="h-4 w-4" aria-hidden="true" />
            {t("songs:playAll")}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && !data ? (
          <ListSkeleton rows={3} />
        ) : songs.length === 0 && artists.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("favorites.none")}</p>
        ) : (
          <>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {songs.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-2 p-3 rounded-lg border"
                >
                  <div className="min-w-0">
                    <Link
                      to={`/songs/${s.id}`}
                      className="text-sm font-medium hover:underline block truncate"
                    >
                      {s.title}
                    </Link>
                    <Link
                      to={`/artists/${s.artist.id}`}
                      className="text-xs text-muted-foreground hover:underline block truncate"
                    >
                      {s.artist.name}
                    </Link>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <PlayButton
                      track={{ url: s.youtubeUrl, title: s.title, artist: s.artist.name }}
                    />
                    <FavoriteButton
                      active={s.isFavorite}
                      onToggle={(f) => favorite.song(s.id, f)}
                    />
                  </div>
                </li>
              ))}
            </ul>
            {artists.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2">{t("favorites.artists")}</h3>
                <ul className="flex flex-wrap gap-2">
                  {artists.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center gap-1 rounded-full border pl-3 pr-1 py-1 text-sm"
                    >
                      <Link to={`/artists/${a.id}`} className="hover:underline">
                        {a.name}
                      </Link>
                      <FavoriteButton
                        active={a.isFavorite}
                        onToggle={(f) => favorite.artist(a.id, f)}
                        className="h-6 w-6 border-0"
                      />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
