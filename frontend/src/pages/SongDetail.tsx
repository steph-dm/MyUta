import { lazy, Suspense, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@apollo/client";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Music, Pencil, Plus, Trash2 } from "lucide-react";
import { SONG } from "@/graphql/library";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  EmptyState,
  ErrorBoundary,
  ErrorState,
  FavoriteButton,
  GenreBadges,
  MachineSection,
  PageSkeleton,
  PlayButton,
} from "@/components/shared";
import EditSongDialog from "@/components/songs/EditSongDialog";
import DeleteSongDialog from "@/components/songs/DeleteSongDialog";
import GoalEditor from "@/components/songs/GoalEditor";
import MachineStatsGrid from "@/components/songs/MachineStatsGrid";
import ReviewsTable from "@/components/reviews/ReviewsTable";
import LogReviewDialog from "@/components/reviews/LogReviewDialog";
import { useFavorite } from "@/hooks/useFavorite";
import { groupByMachine } from "@/lib/machines";

const ScoreChart = lazy(() =>
  import("@/components/songs/Charts").then((m) => ({ default: m.ScoreChart })),
);
const BreakdownChart = lazy(() =>
  import("@/components/songs/Charts").then((m) => ({ default: m.BreakdownChart })),
);

export default function SongDetail() {
  const { t } = useTranslation("songs");
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const favorite = useFavorite();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const { data, loading, error, refetch } = useQuery(SONG, { variables: { id } });

  if (loading && !data) return <PageSkeleton />;
  if (error && !data) return <ErrorState onRetry={() => void refetch()} />;
  const song = data?.song;
  if (!song)
    return (
      <EmptyState
        icon={Music}
        title={t("detail.notFound")}
        action={
          <Button asChild variant="outline">
            <Link to="/songs">{t("detail.back")}</Link>
          </Button>
        }
      />
    );

  const groups = groupByMachine(song.reviews);
  const goals = new Map(song.goals.map((g) => [g.machineType, g]));

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="gap-1 -ml-2">
        <Link to="/songs">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {t("detail.back")}
        </Link>
      </Button>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold break-words">{song.title}</h1>
              <Link
                to={`/artists/${song.artist.id}`}
                className="text-muted-foreground hover:underline"
              >
                {song.artist.name}
              </Link>
              <div className="mt-2">
                <GenreBadges genres={song.genres} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <PlayButton
                track={{ url: song.youtubeUrl, title: song.title, artist: song.artist.name }}
                className="h-9 w-9"
              />
              <FavoriteButton
                active={song.isFavorite}
                onToggle={(f) => favorite.song(song.id, f)}
                className="h-9 w-9"
              />
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1"
                onClick={() => setEditing(true)}
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
                <Plus className="h-4 w-4" aria-hidden="true" /> {t("detail.add")}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {song.reviews.length === 0 ? (
        <EmptyState icon={Music} title={t("detail.noTakes")} />
      ) : (
        groups.map(({ type, meta, items }) => (
          <MachineSection
            key={type}
            type={type}
            count={items.length}
            countLabel={
              items.length ? t("card.reviews", { count: items.length }) : t("reviews:none")
            }
          >
            <div className="space-y-4">
              <GoalEditor songId={song.id} machine={type} goal={goals.get(type)} />
              {items.length > 0 && (
                <>
                  <MachineStatsGrid
                    scores={[...items]
                      .sort(
                        (a, b) =>
                          b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
                      )
                      .map((r) => r.score)}
                    accent={meta.accent}
                  />
                  <ErrorBoundary compact>
                    <Suspense fallback={<Skeleton className="h-[300px] w-full" />}>
                      <Card>
                        <CardHeader>
                          <CardTitle as="h3" className="text-base">
                            {t("detail.timeline")}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ScoreChart machine={type} reviews={items} />
                        </CardContent>
                      </Card>
                      {items.some((r) => r.details) && (
                        <Card>
                          <CardHeader>
                            <CardTitle as="h3" className="text-base">
                              {t("detail.breakdown")}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <BreakdownChart machine={type} reviews={items} />
                          </CardContent>
                        </Card>
                      )}
                    </Suspense>
                  </ErrorBoundary>
                  <ReviewsTable
                    filter={{ songId: song.id, machineType: type }}
                    hideSong
                    caption={t("detail.history")}
                  />
                </>
              )}
            </div>
          </MachineSection>
        ))
      )}
      {editing && <EditSongDialog song={song} onClose={() => setEditing(false)} />}
      <DeleteSongDialog
        song={deleting ? song : null}
        onClose={() => setDeleting(false)}
        onDeleted={() => navigate("/songs", { replace: true })}
      />
      <LogReviewDialog
        open={logOpen}
        onOpenChange={setLogOpen}
        preset={{
          artist: { id: song.artist.id, name: song.artist.name },
          song: {
            id: song.id,
            title: song.title,
            genres: song.genres,
            youtubeUrl: song.youtubeUrl,
          },
        }}
      />
    </div>
  );
}
