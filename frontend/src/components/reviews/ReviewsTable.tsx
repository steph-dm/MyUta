import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "@apollo/client";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { MessageSquareText, Pencil, Share2, Trash2 } from "lucide-react";
import { DELETE_REVIEWS, REVIEWS } from "@/graphql/reviews";
import type { ReviewFilter, ReviewWithSongFragment } from "@/gql/graphql";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ErrorState,
  IssueBadges,
  ListSkeleton,
  Pagination,
  PlayButton,
  ScoreBadge,
} from "@/components/shared";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useIsDesktop } from "@/hooks/useMediaQuery";
import { useReviewTableState } from "@/hooks/useReviewTableState";
import { trackEvent } from "@/lib/analytics";
import { formatDay } from "@/lib/dates";
import { errorMessage } from "@/lib/errors";
import { MACHINES } from "@/lib/machines";
import { shareScoreCard } from "@/lib/scoreCard";
import EditReviewDialog from "./EditReviewDialog";
import ReviewsToolbar from "./ReviewsToolbar";
import { REVIEW_LISTS } from "./LogReviewDialog";

interface Props {
  /** Fixed filter, e.g. one machine or one song. */
  filter?: ReviewFilter;
  /** Read-only list (no selection, edit or delete). */
  readOnly?: boolean;
  /** Hide the song/artist columns (on a song page). */
  hideSong?: boolean;
  caption: string;
}

export default function ReviewsTable({ filter: baseFilter, readOnly, hideSong, caption }: Props) {
  const { t } = useTranslation("reviews");
  const { user } = useAuth();
  const isDesktop = useIsDesktop();
  const state = useReviewTableState(baseFilter);
  const [editing, setEditing] = useState<ReviewWithSongFragment | null>(null);
  const [deleting, setDeleting] = useState<string[] | null>(null);
  const { data, loading, error, refetch } = useQuery(REVIEWS, {
    variables: {
      filter: state.filter,
      sort: state.sort,
      limit: state.pageSize,
      offset: (state.page - 1) * state.pageSize,
    },
  });
  const [deleteReviews, { loading: deletingBusy }] = useMutation(DELETE_REVIEWS, {
    refetchQueries: REVIEW_LISTS,
  });
  const items = useMemo(() => data?.reviews.items ?? [], [data]);
  const total = data?.reviews.totalCount ?? null;

  const { pruneSelection } = state;
  useEffect(() => pruneSelection(items.map((r) => r.id)), [items, pruneSelection]);

  // Going past the last page after deletions: step back.
  const { page, pageSize, setPage } = state;
  useEffect(() => {
    if (total !== null && page > 1 && (page - 1) * pageSize >= total)
      setPage(Math.max(1, Math.ceil(total / pageSize)));
  }, [total, page, pageSize, setPage]);

  const share = (r: ReviewWithSongFragment) => {
    trackEvent({ name: "share_score_card" });
    void shareScoreCard(r, {
      genreLabel: (g) => t(`common:genres.${g}`),
      shareTitle: `${r.song.title} – ${r.score.toFixed(3)}`,
      userName: user?.name,
      userEmail: user?.email,
    });
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      const { data: d } = await deleteReviews({ variables: { ids: deleting } });
      trackEvent({ name: "delete_reviews" });
      toast.success(t("toast.deleted", { count: d?.deleteReviews ?? deleting.length }));
      state.setSelected(new Set());
    } catch (e) {
      toast.error(errorMessage(e, t));
    } finally {
      setDeleting(null);
    }
  };

  const allSelected = items.length > 0 && items.every((r) => state.selected.has(r.id));

  const actions = (r: ReviewWithSongFragment) => (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => share(r)}
        aria-label={t("common:actions.share")}
        title={t("common:actions.share")}
      >
        <Share2 className="h-4 w-4" aria-hidden="true" />
      </Button>
      {!readOnly && (
        <>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setEditing(r)}
            aria-label={t("table.edit")}
            title={t("table.edit")}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 text-destructive"
            onClick={() => setDeleting([r.id])}
            aria-label={t("table.delete")}
            title={t("table.delete")}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </>
      )}
    </div>
  );

  const notes = (r: ReviewWithSongFragment) =>
    r.notes ? (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            aria-label={t("table.viewNotes")}
          >
            <MessageSquareText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 text-sm whitespace-pre-wrap" side="top">
          {r.notes}
        </PopoverContent>
      </Popover>
    ) : (
      <span className="text-muted-foreground" aria-hidden="true">
        –
      </span>
    );

  const meta = (r: ReviewWithSongFragment) => (
    <>
      {r.keyChange !== 0 && (
        <span className="text-xs text-muted-foreground tabular-nums">
          {t("fields.keyChange")} {r.keyChange > 0 ? `+${r.keyChange}` : r.keyChange}
        </span>
      )}
      {r.variant && <span className="text-xs text-muted-foreground">{r.variant}</span>}
    </>
  );

  return (
    <div className="space-y-4">
      <ReviewsToolbar state={state} total={total} />
      {!readOnly && state.selected.size > 0 && (
        <Button
          variant="destructive"
          size="sm"
          className="gap-2"
          onClick={() => setDeleting([...state.selected])}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          {t("table.deleteSelected", { count: state.selected.size })}
        </Button>
      )}
      {error && !data ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : loading && !data ? (
        <ListSkeleton rows={state.pageSize > 10 ? 10 : state.pageSize} />
      ) : items.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          {state.hasFilters ? t("table.noMatches") : t("table.empty")}
        </p>
      ) : isDesktop ? (
        <Table>
          <caption className="sr-only">{caption}</caption>
          <TableHeader>
            <TableRow>
              {!readOnly && (
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() =>
                      state.setSelected(allSelected ? new Set() : new Set(items.map((r) => r.id)))
                    }
                    aria-label={t("table.selectPage")}
                  />
                </TableHead>
              )}
              <TableHead>{t("table.date")}</TableHead>
              {!hideSong && <TableHead>{t("table.song")}</TableHead>}
              <TableHead>{t("table.score")}</TableHead>
              <TableHead>{t("table.issues")}</TableHead>
              <TableHead>{t("table.notes")}</TableHead>
              <TableHead>{t("table.listen")}</TableHead>
              <TableHead>{t("table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((r) => (
              <TableRow key={r.id} data-state={state.selected.has(r.id) ? "selected" : undefined}>
                {!readOnly && (
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={state.selected.has(r.id)}
                      onChange={() => state.toggle(r.id)}
                      aria-label={t("table.select", {
                        song: r.song.title,
                        date: formatDay(r.date),
                      })}
                    />
                  </TableCell>
                )}
                <TableCell className="whitespace-nowrap tabular-nums">
                  {formatDay(r.date)}
                </TableCell>
                {!hideSong && (
                  <TableCell className="max-w-[280px]">
                    <Link
                      to={`/songs/${r.song.id}`}
                      className="font-medium hover:underline block truncate"
                    >
                      {r.song.title}
                    </Link>
                    <Link
                      to={`/artists/${r.song.artist.id}`}
                      className="text-xs text-muted-foreground hover:underline block truncate"
                    >
                      {r.song.artist.name}
                    </Link>
                  </TableCell>
                )}
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    <ScoreBadge
                      score={r.score}
                      machine={r.machineType}
                      personalBest={r.isPersonalBest}
                    />
                    {meta(r)}
                  </div>
                </TableCell>
                <TableCell>
                  {r.issues.length ? (
                    <IssueBadges issues={r.issues} />
                  ) : (
                    <span className="text-muted-foreground">–</span>
                  )}
                </TableCell>
                <TableCell>{notes(r)}</TableCell>
                <TableCell>
                  <PlayButton
                    track={{
                      url: r.song.youtubeUrl,
                      title: r.song.title,
                      artist: r.song.artist.name,
                    }}
                  />
                </TableCell>
                <TableCell>{actions(r)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <ul className="space-y-2" aria-label={caption}>
          {items.map((r) => (
            <li
              key={r.id}
              className="rounded-lg border p-3 space-y-2"
              data-state={state.selected.has(r.id) ? "selected" : undefined}
            >
              <div className="flex items-start gap-2">
                {!readOnly && (
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={state.selected.has(r.id)}
                    onChange={() => state.toggle(r.id)}
                    aria-label={t("table.select", { song: r.song.title, date: formatDay(r.date) })}
                  />
                )}
                <div className="min-w-0 flex-1">
                  {!hideSong && (
                    <>
                      <Link
                        to={`/songs/${r.song.id}`}
                        className="font-medium hover:underline block truncate"
                      >
                        {r.song.title}
                      </Link>
                      <Link
                        to={`/artists/${r.song.artist.id}`}
                        className="text-sm text-muted-foreground hover:underline block truncate"
                      >
                        {r.song.artist.name}
                      </Link>
                    </>
                  )}
                  <span className="block text-xs text-muted-foreground tabular-nums">
                    {formatDay(r.date)}
                    {!baseFilter?.machineType && (
                      <>
                        {" · "}
                        <span className={MACHINES[r.machineType].accent}>
                          {MACHINES[r.machineType].label}
                        </span>
                      </>
                    )}
                  </span>
                  {(r.keyChange !== 0 || r.variant) && (
                    <div className="mt-1 flex flex-wrap items-center gap-2">{meta(r)}</div>
                  )}
                  {r.issues.length > 0 && (
                    <div className="mt-2">
                      <IssueBadges issues={r.issues} />
                    </div>
                  )}
                </div>
                <ScoreBadge
                  score={r.score}
                  machine={r.machineType}
                  personalBest={r.isPersonalBest}
                />
              </div>
              <div className="flex items-center justify-end gap-1">
                {r.notes && notes(r)}
                <PlayButton
                  track={{
                    url: r.song.youtubeUrl,
                    title: r.song.title,
                    artist: r.song.artist.name,
                  }}
                />
                {actions(r)}
              </div>
            </li>
          ))}
        </ul>
      )}
      <Pagination
        page={state.page}
        pageSize={state.pageSize}
        total={total ?? 0}
        onPage={state.setPage}
        onPageSize={state.setPageSize}
      />
      <EditReviewDialog
        review={editing}
        song={editing ? { title: editing.song.title, artistName: editing.song.artist.name } : null}
        onClose={() => setEditing(null)}
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={t("delete.title", { count: deleting?.length ?? 1 })}
        description={t("delete.description")}
        confirmLabel={deletingBusy ? t("common:actions.deleting") : t("common:actions.delete")}
        destructive
        busy={deletingBusy}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
