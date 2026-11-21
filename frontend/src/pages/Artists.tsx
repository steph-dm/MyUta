import { useDeferredValue, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@apollo/client";
import { useTranslation } from "react-i18next";
import { Heart, Mic2, Pencil, Search } from "lucide-react";
import { ARTISTS } from "@/graphql/library";
import type { ArtistSort } from "@/gql/graphql";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  EmptyState,
  ErrorState,
  FavoriteButton,
  ListSkeleton,
  Pagination,
} from "@/components/shared";
import { EditArtistDialog } from "@/components/artists/ArtistDialogs";
import { useFavorite } from "@/hooks/useFavorite";
import { PAGE_SIZES } from "@/lib/utils";

const SORTS: { value: ArtistSort; key: string }[] = [
  { value: "NAME_ASC", key: "common:sort.aToZ" },
  { value: "NAME_DESC", key: "common:sort.zToA" },
];

export default function Artists() {
  const { t } = useTranslation("artists");
  const [search, setSearch] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sort, setSort] = useState<ArtistSort>("NAME_ASC");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[2]);
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const deferred = useDeferredValue(search);
  const favorite = useFavorite();
  const { data, loading, error, refetch } = useQuery(ARTISTS, {
    variables: {
      filter: { search: deferred.trim() || null, favoritesOnly },
      sort,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    },
  });
  const items = data?.artists.items ?? [];
  const total = data?.artists.totalCount ?? 0;
  const filtered = !!(deferred || favoritesOnly);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        {data && <p className="text-sm text-muted-foreground">{t("catalog", { count: total })}</p>}
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
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
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-8 h-9"
          />
        </div>
        <Button
          variant={favoritesOnly ? "default" : "outline"}
          size="sm"
          className="h-9 gap-1"
          aria-pressed={favoritesOnly}
          onClick={() => {
            setFavoritesOnly(!favoritesOnly);
            setPage(1);
          }}
        >
          <Heart className="h-4 w-4" aria-hidden="true" />
          {t("songs:filters.favoritesOnly")}
        </Button>
        <label>
          <span className="sr-only">{t("common:sort.label")}</span>
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as ArtistSort);
              setPage(1);
            }}
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {t(s.key)}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && !data ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : loading && !data ? (
        <ListSkeleton rows={6} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Mic2}
          title={filtered ? t("common:empty.noResults") : t("empty.none")}
          description={filtered ? t("common:empty.noResultsDesc") : t("empty.noneDesc")}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((a) => (
            <Card key={a.id} className="relative">
              <div className="absolute top-3 right-3 flex gap-1">
                <FavoriteButton active={a.isFavorite} onToggle={(f) => favorite.artist(a.id, f)} />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setEditing(a)}
                  aria-label={t("card.edit")}
                  title={t("card.edit")}
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
              <CardHeader className="pr-24">
                <CardTitle className="text-lg">
                  <Link to={`/artists/${a.id}`} className="hover:underline">
                    {a.name}
                  </Link>
                </CardTitle>
                <CardDescription>
                  {t("card.songs", { count: a.songCount })} ·{" "}
                  {t("reviews:count", { count: a.reviewCount })}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPage={setPage}
        onPageSize={(s) => {
          setPageSize(s);
          setPage(1);
        }}
      />
      <EditArtistDialog artist={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
