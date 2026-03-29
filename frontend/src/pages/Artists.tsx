import { useState, useMemo, useDeferredValue } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { useTranslation } from "react-i18next";
import { GET_ARTISTS, TOGGLE_FAVORITE_ARTIST } from "../graphql/queries";
import { trackEvent } from "../lib/analytics";
import type { ArtistDetail } from "../types";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Search, Edit, Heart, Users } from "lucide-react";
import MaterialIcon from "../components/ui/MaterialIcon";
import { Link } from "react-router-dom";
import { GridSkeleton } from "../components/shared/Skeletons";
import EmptyState from "../components/shared/EmptyState";
import EditArtistModal from "../components/artists/EditArtistModal";

const Artists = () => {
  const { t } = useTranslation("artists");
  const { loading, error, data } = useQuery(GET_ARTISTS, {
    fetchPolicy: "cache-and-network",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name-asc" | "name-desc">("name-asc");
  const [editingArtist, setEditingArtist] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [toggleFavoriteArtist] = useMutation(TOGGLE_FAVORITE_ARTIST, {
    update(cache, _, { variables }) {
      cache.modify({
        id: cache.identify({ __typename: "Artist", id: variables?.artistId }),
        fields: { isFavorite: (prev: boolean) => !prev },
      });
    },
  });

  const artists = useMemo(() => data?.artists || [], [data?.artists]);

  const deferredSearchQuery = useDeferredValue(searchQuery);
  const isSearchPending = deferredSearchQuery !== searchQuery;

  const displayedArtists = useMemo(() => {
    let result = [...artists];

    if (deferredSearchQuery.trim()) {
      const q = deferredSearchQuery.toLowerCase();
      result = result.filter((a: ArtistDetail) =>
        a.name.toLowerCase().includes(q),
      );
    }

    switch (sortBy) {
      case "name-asc":
        result.sort((a: ArtistDetail, b: ArtistDetail) =>
          a.name.localeCompare(b.name),
        );
        break;
      case "name-desc":
        result.sort((a: ArtistDetail, b: ArtistDetail) =>
          b.name.localeCompare(a.name),
        );
        break;
    }

    return result;
  }, [artists, deferredSearchQuery, sortBy]);

  const hasActiveFilters = !!searchQuery;

  if (loading)
    return (
      <div className="space-y-6">
        <GridSkeleton count={6} />
      </div>
    );
  if (error)
    return (
      <div className="text-red-600 py-8">
        {t("errors.loadFailed", { ns: "common" })}
      </div>
    );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>
            {t("catalog", { count: artists.length })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-4">
            <div className="relative w-full sm:flex-1 sm:min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() =>
                  setSortBy(sortBy === "name-asc" ? "name-desc" : "name-asc")
                }
                aria-label={
                  sortBy === "name-asc"
                    ? t("sort.aToZ", { ns: "common" })
                    : t("sort.zToA", { ns: "common" })
                }
              >
                <span className="hidden min-[400px]:inline">
                  {sortBy === "name-asc"
                    ? t("sort.aToZ", { ns: "common" })
                    : t("sort.zToA", { ns: "common" })}
                </span>
                <span className="min-[400px]:hidden">
                  {sortBy === "name-asc" ? "A→Z" : "Z→A"}
                </span>
              </Button>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 text-muted-foreground"
                  onClick={() => setSearchQuery("")}
                >
                  {t("actions.clear", { ns: "common" })}
                </Button>
              )}
            </div>
          </div>

          {hasActiveFilters && (
            <p className="text-sm text-muted-foreground mb-3">
              {t("showing", {
                count: displayedArtists.length,
                total: artists.length,
                ns: "common",
              })}
            </p>
          )}

          {displayedArtists.length === 0 ? (
            artists.length === 0 ? (
              <EmptyState
                icon={Users}
                title={t("empty.noArtists")}
                description={t("empty.noArtistsDesc")}
              />
            ) : (
              <EmptyState
                icon={Search}
                title={t("empty.noResults")}
                description={t("empty.noResultsDesc")}
              />
            )
          ) : (
            <div
              className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 transition-opacity ${isSearchPending ? "opacity-60" : "opacity-100"}`}
            >
              {displayedArtists.map((artist: ArtistDetail) => (
                <Card
                  key={artist.id}
                  className="relative hover:shadow-md transition-shadow"
                >
                  <div className="absolute top-3 right-3 flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className={`h-8 w-8 p-0 ${artist.isFavorite ? "text-red-500" : ""}`}
                      onClick={() => {
                        toggleFavoriteArtist({
                          variables: { artistId: artist.id },
                        });
                        trackEvent({
                          name: "toggle_favorite",
                          data: { type: "artist" },
                        });
                      }}
                      title={
                        artist.isFavorite
                          ? t("card.removeFromFavorites")
                          : t("card.addToFavorites")
                      }
                      aria-label={
                        artist.isFavorite
                          ? t("card.removeFromFavorites")
                          : t("card.addToFavorites")
                      }
                    >
                      <Heart
                        className={`h-4 w-4 ${artist.isFavorite ? "fill-current" : ""}`}
                      />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() =>
                        setEditingArtist({ id: artist.id, name: artist.name })
                      }
                      title={t("card.editArtist")}
                      aria-label={t("card.editArtist")}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardHeader className="pr-24">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MaterialIcon icon="music_note" size={20} />
                      <Link
                        to={`/artists/${artist.id}`}
                        className="hover:underline transition-colors truncate"
                      >
                        {artist.name}
                      </Link>
                    </CardTitle>
                    <CardDescription>
                      {t("card.songsAvailable", { count: artist.songs.length })}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <EditArtistModal
        isOpen={!!editingArtist}
        onClose={() => setEditingArtist(null)}
        artist={editingArtist}
      />
    </div>
  );
};

export default Artists;
