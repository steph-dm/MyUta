import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@apollo/client";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Music, Pencil, Plus, Trash2 } from "lucide-react";
import { ARTIST } from "@/graphql/library";
import type { SongSummaryFragment } from "@/gql/graphql";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, FavoriteButton, PageSkeleton } from "@/components/shared";
import { DeleteArtistDialog, EditArtistDialog } from "@/components/artists/ArtistDialogs";
import SongCard from "@/components/songs/SongCard";
import EditSongDialog from "@/components/songs/EditSongDialog";
import LogReviewDialog from "@/components/reviews/LogReviewDialog";
import { useFavorite } from "@/hooks/useFavorite";

export default function ArtistDetail() {
  const { t } = useTranslation("artists");
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const favorite = useFavorite();
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<SongSummaryFragment | null>(null);
  const { data, loading, error, refetch } = useQuery(ARTIST, { variables: { id } });

  if (loading && !data) return <PageSkeleton />;
  if (error && !data) return <ErrorState onRetry={() => void refetch()} />;
  const artist = data?.artist;
  if (!artist)
    return (
      <EmptyState
        icon={Music}
        title={t("detail.notFound")}
        action={
          <Button asChild variant="outline">
            <Link to="/artists">{t("detail.back")}</Link>
          </Button>
        }
      />
    );

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="gap-1 -ml-2">
        <Link to="/artists">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {t("detail.back")}
        </Link>
      </Button>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{artist.name}</h1>
          <p className="text-sm text-muted-foreground">
            {t("card.songs", { count: artist.songCount })} ·{" "}
            {t("reviews:count", { count: artist.reviewCount })}
          </p>
        </div>
        <div className="flex gap-2">
          <FavoriteButton
            active={artist.isFavorite}
            onToggle={(f) => favorite.artist(artist.id, f)}
            className="h-9 w-9"
          />
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1"
            onClick={() => setRenaming(true)}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" /> {t("card.edit")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1 text-destructive"
            onClick={() => setDeleting(true)}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" /> {t("delete.button")}
          </Button>
          <Button size="sm" className="h-9 gap-1" onClick={() => setLogOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" /> {t("reviews:add")}
          </Button>
        </div>
      </div>
      {artist.songs.length === 0 ? (
        <EmptyState
          icon={Music}
          title={t("detail.noSongs")}
          description={t("detail.noSongsDesc")}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {artist.songs.map((s) => (
            <SongCard key={s.id} song={s} onFavorite={favorite.song} onEdit={setEditingSong} />
          ))}
        </div>
      )}
      {renaming && (
        <EditArtistDialog
          artist={artist}
          onClose={() => setRenaming(false)}
          onMerged={(target) => navigate(`/artists/${target}`, { replace: true })}
        />
      )}
      <DeleteArtistDialog
        artist={deleting ? artist : null}
        onClose={() => setDeleting(false)}
        onDeleted={() => navigate("/artists", { replace: true })}
      />
      <EditSongDialog song={editingSong} onClose={() => setEditingSong(null)} />
      <LogReviewDialog
        open={logOpen}
        onOpenChange={setLogOpen}
        preset={{ artist: { id: artist.id, name: artist.name } }}
      />
    </div>
  );
}
