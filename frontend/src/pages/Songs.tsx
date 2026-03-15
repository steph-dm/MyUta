import { useState, useMemo, useDeferredValue, useCallback } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { useTranslation } from "react-i18next";
import { GET_SONGS, TOGGLE_FAVORITE } from "../graphql/queries";
import { trackEvent } from "../lib/analytics";
import type { Song } from "../types";
import { GENRE_OPTIONS } from "../types";
import EditSongModal from "../components/songs/EditSongModal";
import SongCard from "../components/songs/SongCard";
import FloatingPlayer from "../components/shared/FloatingPlayer";
import EmptyState from "../components/shared/EmptyState";
import { GridSkeleton } from "../components/shared/Skeletons";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "../components/ui/command";
import { Heart, Search, Filter, Check, Music } from "lucide-react"; // Added Music icon
import { cn } from "../lib/utils";


const Songs = () => {
  const { t } = useTranslation("songs");
  const { loading, error, data, refetch } = useQuery(GET_SONGS, {
    fetchPolicy: "cache-and-network",
  });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [activePlayerUrl, setActivePlayerUrl] = useState<string | null>(null);
  const [activePlayerInfo, setActivePlayerInfo] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [genreFilterOpen, setGenreFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"title-asc" | "title-desc">("title-asc");

  const [toggleFavorite] = useMutation(TOGGLE_FAVORITE, {
    update(cache, _, { variables }) {
      cache.modify({
        id: cache.identify({ __typename: "Song", id: variables?.songId }),
        fields: { isFavorite: (prev: boolean) => !prev },
      });
    },
  });

  const handleEditSong = useCallback((song: Song) => {
    setEditingSong(song);
    setIsEditModalOpen(true);
  }, []);

  const handleSongUpdated = useCallback(() => {
    refetch();
    setIsEditModalOpen(false);
    setEditingSong(null);
  }, [refetch]);

  const handlePlay = useCallback((url: string, info: string) => {
    setActivePlayerUrl(url);
    setActivePlayerInfo(info);
  }, []);

  const handleStop = useCallback(() => {
    setActivePlayerUrl(null);
  }, []);

  const songs = useMemo(() => data?.songs || [], [data?.songs]);

  const deferredSearchQuery = useDeferredValue(searchQuery);
  const deferredGenres = useDeferredValue(selectedGenres);
  const isSearchPending = deferredSearchQuery !== searchQuery;

  const displayedSongs = useMemo(() => {
    let result = [...songs];

    if (showFavoritesOnly) {
      result = result.filter((s: Song) => s.isFavorite);
    }

    if (deferredSearchQuery.trim()) {
      const q = deferredSearchQuery.toLowerCase();
      result = result.filter(
        (s: Song) =>
          s.title.toLowerCase().includes(q) ||
          s.artist.name.toLowerCase().includes(q),
      );
    }

    if (deferredGenres.length > 0) {
      result = result.filter((s: Song) =>
        s.genres.some((g) => deferredGenres.includes(g)),
      );
    }

    switch (sortBy) {
      case "title-asc":
        result.sort((a: Song, b: Song) => a.title.localeCompare(b.title));
        break;
      case "title-desc":
        result.sort((a: Song, b: Song) => b.title.localeCompare(a.title));
        break;
    }

    return result;
  }, [songs, showFavoritesOnly, deferredSearchQuery, deferredGenres, sortBy]);

  const hasActiveFilters = !!(searchQuery || selectedGenres.length > 0 || showFavoritesOnly);

  if (loading)
    return <div className="space-y-6"><GridSkeleton count={6} /></div>;
  if (error)
    return <div className="text-red-600 py-8">{error.message}</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>
            {t("catalog", { count: songs.length })}
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

            <Popover open={genreFilterOpen} onOpenChange={setGenreFilterOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  <Filter className="h-4 w-4 min-[400px]:mr-1" />
                  <span className="hidden min-[400px]:inline">{t("filters.genre")}</span>
                  {selectedGenres.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1 text-xs">
                      {selectedGenres.length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-0" align="start">
                <Command>
                  <CommandInput placeholder={t("filters.searchGenres")} />
                  <CommandEmpty>{t("filters.noGenresFound")}</CommandEmpty>
                  <CommandGroup>
                    {[...GENRE_OPTIONS].sort((a, b) =>
                      t(`genreNames.${a}`).localeCompare(t(`genreNames.${b}`))
                    ).map((genre) => (
                      <CommandItem
                        key={genre}
                        onSelect={() =>
                          setSelectedGenres((prev) =>
                            prev.includes(genre)
                              ? prev.filter((g) => g !== genre)
                              : [...prev, genre],
                          )
                        }
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedGenres.includes(genre) ? "opacity-100" : "opacity-0",
                          )}
                        />
                        {t(`genreNames.${genre}`)}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>

            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => setSortBy(sortBy === "title-asc" ? "title-desc" : "title-asc")}
            >
              <span className="hidden min-[400px]:inline">{sortBy === "title-asc" ? t("sort.aToZ", { ns: "common" }) : t("sort.zToA", { ns: "common" })}</span>
              <span className="min-[400px]:hidden">{sortBy === "title-asc" ? "A→Z" : "Z→A"}</span>
            </Button>

            <Button
              variant={showFavoritesOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className="gap-2 h-9"
            >
              <Heart className={`h-4 w-4 ${showFavoritesOnly ? "fill-current" : ""}`} />
              <span className="hidden min-[400px]:inline">{t("filters.favoritesOnly")}</span>
            </Button>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-muted-foreground"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedGenres([]);
                  setShowFavoritesOnly(false);
                }}
              >
                {t("actions.clear", { ns: "common" })}
              </Button>
            )}
            </div>
          </div>

          {selectedGenres.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {selectedGenres.map((genre) => (
                <Badge
                  key={genre}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() =>
                    setSelectedGenres((prev) => prev.filter((g) => g !== genre))
                  }
                >
                  {t(`genreNames.${genre}`)} &times;
                </Badge>
              ))}
            </div>
          )}

          {hasActiveFilters && (
            <p className="text-sm text-muted-foreground mb-3">
              {t("showing", { count: displayedSongs.length, total: songs.length, ns: "common" })}
            </p>
          )}

          {displayedSongs.length === 0 ? (
            songs.length === 0 ? (
              <EmptyState
                icon={Music}
                title={t("empty.noSongs")}
                description={t("empty.noSongsDesc")}
              />
            ) : (
              <EmptyState
                icon={Search}
                title={t("empty.noResults")}
                description={t("empty.noResultsDesc")}
              />
            )
          ) : (
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 transition-opacity ${isSearchPending ? "opacity-60" : "opacity-100"}`}>
              {displayedSongs.map((song: Song) => (
                <SongCard
                  key={song.id}
                  song={song}
                  artistName={song.artist.name}
                  artistId={song.artist.id}
                  activePlayerUrl={activePlayerUrl}
                  onToggleFavorite={() => { toggleFavorite({ variables: { songId: song.id } }); trackEvent({ name: "toggle_favorite", data: { type: "song" } }); }}
                  onEdit={() => handleEditSong(song)}
                  onPlay={handlePlay}
                  onStop={handleStop}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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

export default Songs;
