import { useDeferredValue, useState } from "react";
import { useQuery } from "@apollo/client";
import { useTranslation } from "react-i18next";
import { Heart, Music, Search } from "lucide-react";
import { SONGS } from "@/graphql/library";
import type { Genre, SongSort, SongSummaryFragment } from "@/gql/graphql";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, ErrorState, GenrePicker, ListSkeleton, Pagination } from "@/components/shared";
import SongCard from "@/components/songs/SongCard";
import EditSongDialog from "@/components/songs/EditSongDialog";
import { useFavorite } from "@/hooks/useFavorite";
import { PAGE_SIZES } from "@/lib/utils";

const SORTS: { value: SongSort; key: string }[] = [
  { value: "TITLE_ASC", key: "common:sort.aToZ" },
  { value: "TITLE_DESC", key: "common:sort.zToA" },
  { value: "RECENT", key: "common:sort.recent" },
];

export default function Songs() {
  const { t } = useTranslation("songs");
  const [search, setSearch] = useState("");
  const [genres, setGenres] = useState<Genre[]>([]);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sort, setSort] = useState<SongSort>("TITLE_ASC");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[2]);
  const [editing, setEditing] = useState<SongSummaryFragment | null>(null);
  const deferred = useDeferredValue(search);
  const favorite = useFavorite();
  const { data, loading, error, refetch } = useQuery(SONGS, {
    variables: {
      filter: {
        search: deferred.trim() || null,
        genres: genres.length ? genres : null,
        favoritesOnly,
      },
      sort,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    },
  });
  const items = data?.songs.items ?? [];
  const total = data?.songs.totalCount ?? 0;
  const filtered = !!(deferred || genres.length || favoritesOnly);
  const reset =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      setPage(1);
    };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        {data && <p className="text-sm text-muted-foreground">{t("catalog", { count: total })}</p>}
      </div>
      <div className="flex flex-col lg:flex-row gap-2">
        <div className="relative flex-1">
          <Search
            className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            aria-label={t("search")}
            placeholder={t("search")}
            value={search}
            onChange={(e) => reset(setSearch)(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <div className="flex flex-wrap gap-2 items-start">
          <div className="w-48">
            <GenrePicker values={genres} onChange={reset(setGenres)} />
          </div>
          <Button
            variant={favoritesOnly ? "default" : "outline"}
            size="sm"
            className="h-9 gap-1"
            aria-pressed={favoritesOnly}
            onClick={() => reset(setFavoritesOnly)(!favoritesOnly)}
          >
            <Heart className="h-4 w-4" aria-hidden="true" />
            {t("filters.favoritesOnly")}
          </Button>
          <label className="flex items-center gap-1 text-sm">
            <span className="sr-only">{t("common:sort.label")}</span>
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm"
              value={sort}
              onChange={(e) => reset(setSort)(e.target.value as SongSort)}
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {t(s.key)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      {error && !data ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : loading && !data ? (
        <ListSkeleton rows={6} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Music}
          title={filtered ? t("common:empty.noResults") : t("empty.none")}
          description={filtered ? t("common:empty.noResultsDesc") : t("empty.noneDesc")}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((s) => (
            <SongCard key={s.id} song={s} onFavorite={favorite.song} onEdit={setEditing} />
          ))}
        </div>
      )}
      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPage={setPage}
        onPageSize={reset(setPageSize)}
      />
      <EditSongDialog song={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
