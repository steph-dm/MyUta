import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { useParams, Link } from "react-router-dom";
import { GET_ARTIST, TOGGLE_FAVORITE, TOGGLE_FAVORITE_ARTIST } from "../graphql/queries";
import type { Song } from "../types";
import { trackEvent } from "../lib/analytics";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { ArrowLeft, Music, Heart } from "lucide-react";
import MaterialIcon from "../components/ui/MaterialIcon";
import SongCard from "../components/songs/SongCard";
import EditSongModal from "../components/songs/EditSongModal";
import FloatingPlayer from "../components/shared/FloatingPlayer";
import EmptyState from "../components/shared/EmptyState";

const Artist = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation("artists");
  const { loading, error, data, refetch } = useQuery(GET_ARTIST, {
    variables: { id },
    fetchPolicy: "cache-and-network",
  });
  const [activePlayerUrl, setActivePlayerUrl] = useState<string | null>(null);
  const [activePlayerInfo, setActivePlayerInfo] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);

  const [toggleFavorite] = useMutation(TOGGLE_FAVORITE, {
    update(cache, _, { variables }) {
      cache.modify({
        id: cache.identify({ __typename: "Song", id: variables?.songId }),
        fields: { isFavorite: (prev: boolean) => !prev },
      });
    },
  });

  const [toggleFavoriteArtist] = useMutation(TOGGLE_FAVORITE_ARTIST, {
    update(cache, _, { variables }) {
      cache.modify({
        id: cache.identify({ __typename: "Artist", id: variables?.artistId }),
        fields: { isFavorite: (prev: boolean) => !prev },
      });
    },
  });

  const handleEditSong = (song: Omit<Song, "artist">) => {
    setEditingSong({ ...song, artist: { id: id!, name: data.artist.name } });
    setIsEditModalOpen(true);
  };

  const handleSongUpdated = () => {
    refetch();
    setIsEditModalOpen(false);
    setEditingSong(null);
  };

  if (loading)
    return null;
  if (error)
    return <div className="text-red-600 py-8">{error.message}</div>;
  if (!data?.artist)
    return <div className="text-muted-foreground py-8">{t("notFound")}</div>;

  const { artist } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link to="/artists">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("backToArtists")}
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <MaterialIcon icon="mic" size={28} className="shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-xl sm:text-2xl leading-tight">
                  {artist.name}
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  className={`h-8 w-8 p-0 shrink-0 ${artist.isFavorite ? "text-red-500" : ""}`}
                  onClick={() => { toggleFavoriteArtist({ variables: { artistId: artist.id } }); trackEvent({ name: "toggle_favorite", data: { type: "artist" } }); }}
                  title={artist.isFavorite ? t("card.removeFromFavorites") : t("card.addToFavorites")}
                  aria-label={artist.isFavorite ? t("card.removeFromFavorites") : t("card.addToFavorites")}
                >
                  <Heart className={`h-4 w-4 ${artist.isFavorite ? "fill-current" : ""}`} />
                </Button>
              </div>
              <CardDescription className="text-sm sm:text-base mt-1">
                {t("card.songsAvailable", { count: artist.songs.length })}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="space-y-4">
        {artist.songs.length === 0 ? (
          <Card>
            <CardContent className="py-4">
              <EmptyState
                icon={Music}
                title={t("empty.title")}
                description={t("empty.description")}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {artist.songs.map((song: Song) => (
              <SongCard
                key={song.id}
                song={song}
                artistName={artist.name}
                artistId={artist.id}
                activePlayerUrl={activePlayerUrl}
                onToggleFavorite={() => { toggleFavorite({ variables: { songId: song.id } }); trackEvent({ name: "toggle_favorite", data: { type: "song" } }); }}
                onEdit={() => handleEditSong(song)}
                onPlay={(url, info) => {
                  setActivePlayerUrl(url);
                  setActivePlayerInfo(info);
                }}
                onStop={() => setActivePlayerUrl(null)}
              />
            ))}
          </div>
        )}
      </div>

      <EditSongModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingSong(null);
        }}
        onSongUpdated={handleSongUpdated}
        song={editingSong}
      />

      {activePlayerUrl && (
        <FloatingPlayer
          url={activePlayerUrl}
          songInfo={activePlayerInfo}
          onClose={() => setActivePlayerUrl(null)}
        />
      )}
    </div>
  );
};

export default Artist;
