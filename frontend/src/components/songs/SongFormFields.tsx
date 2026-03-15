import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLazyQuery } from "@apollo/client";
import { SEARCH_YOUTUBE } from "../../graphql/queries";
import { trackEvent } from "../../lib/analytics";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "../../components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { Check, ChevronsUpDown, X, Search, Loader2 } from "lucide-react";
import { cn, getGenreColor } from "../../lib/utils";
import { GENRE_OPTIONS } from "../../types";
import type { Genre } from "../../types";

interface YouTubeResult {
  videoId: string;
  title: string;
  channelTitle: string;
  duration: string;
  thumbnailUrl: string;
}

interface SongFormFieldsProps {
  title: string;
  onTitleChange: (title: string) => void;
  youtubeUrl: string;
  onYoutubeUrlChange: (url: string, generated: boolean) => void;
  genres: Genre[];
  onGenresChange: (genres: Genre[]) => void;
  artistName: string;
  errors?: Record<string, string>;
  onClearError?: (field: string) => void;
  showTitle?: boolean;
}

const SongFormFields = ({
  title,
  onTitleChange,
  youtubeUrl,
  onYoutubeUrlChange,
  genres,
  onGenresChange,
  artistName,
  errors = {},
  onClearError,
  showTitle = true,
}: SongFormFieldsProps) => {
  const [genresOpen, setGenresOpen] = useState(false);
  const [youtubeResults, setYoutubeResults] = useState<YouTubeResult[]>([]);
  const [youtubeSearchOpen, setYoutubeSearchOpen] = useState(false);
  const { t } = useTranslation("songs");

  const [searchYoutube, { loading: youtubeLoading }] = useLazyQuery(
    SEARCH_YOUTUBE,
    {
      fetchPolicy: "network-only",
      onCompleted: (data) => {
        setYoutubeResults(data.searchYoutube || []);
        trackEvent({ name: "search_youtube" });
        if (data.searchYoutube?.length > 0) {
          setYoutubeSearchOpen(true);
        }
      },
    },
  );

  const handleGenreToggle = (genre: Genre) => {
    const updated = genres.includes(genre)
      ? genres.filter((g) => g !== genre)
      : [...genres, genre];
    onGenresChange(updated);
    onClearError?.("genres");
  };

  const canSearch = artistName.trim() && title.trim();

  return (
    <>
      {showTitle && (
        <div className="space-y-2">
          <Label>{t("form.songTitle")}</Label>
          <Input
            placeholder={t("form.enterSongTitle")}
            value={title}
            onChange={(e) => {
              onTitleChange(e.target.value);
              onClearError?.("song");
              onClearError?.("title");
            }}
            className={cn((errors.song || errors.title) && "border-red-500")}
          />
          {errors.song && <p className="text-sm text-red-500">{errors.song}</p>}
          {errors.title && (
            <p className="text-sm text-red-500">{errors.title}</p>
          )}
        </div>
      )}

      <div className="space-y-2">
        {!showTitle && <Label>{t("form.youtubeUrlOptional")}</Label>}
        <div className="flex gap-2">
          <Input
            placeholder={t("form.youtubeUrlOptional")}
            value={youtubeUrl}
            onChange={(e) => {
              onYoutubeUrlChange(e.target.value, false);
              onClearError?.("youtubeUrl");
            }}
            className={cn("flex-1", errors.youtubeUrl && "border-red-500")}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            disabled={youtubeLoading || !canSearch}
            onClick={() =>
              canSearch &&
              searchYoutube({
                variables: { artist: artistName.trim(), song: title.trim() },
              })
            }
          >
            {youtubeLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>
        {errors.youtubeUrl && (
          <p className="text-sm text-red-500">{errors.youtubeUrl}</p>
        )}
        {youtubeSearchOpen && youtubeResults.length > 0 && (
          <div className="border rounded-md divide-y max-h-60 overflow-y-auto">
            {youtubeResults.map((result) => (
              <button
                key={result.videoId}
                type="button"
                className={cn(
                  "w-full text-left px-3 py-2 text-sm hover:bg-muted/50 flex items-center gap-3 overflow-hidden",
                  youtubeUrl ===
                  `https://www.youtube.com/watch?v=${result.videoId}` &&
                  "bg-muted",
                )}
                onClick={() => {
                  onYoutubeUrlChange(
                    `https://www.youtube.com/watch?v=${result.videoId}`,
                    true,
                  );
                  setYoutubeSearchOpen(false);
                }}
              >
                <img
                  src={result.thumbnailUrl}
                  alt=""
                  className="w-20 h-14 object-cover rounded shrink-0"
                />
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="font-medium leading-snug line-clamp-2">{result.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {result.channelTitle} · {result.duration}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>{t("form.genresRequired")}</Label>
        <Popover open={genresOpen} onOpenChange={setGenresOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={genresOpen}
              className={cn(
                "w-full justify-between",
                errors.genres && "border-red-500",
              )}
            >
              {genres.length === 0
                ? t("form.selectGenres")
                : t("form.genresSelected", { count: genres.length })}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0">
            <Command>
              <CommandInput placeholder={t("form.searchGenres")} />
              <CommandEmpty>{t("form.noGenresFound")}</CommandEmpty>
              <CommandGroup>
                {[...GENRE_OPTIONS].sort((a, b) =>
                  t(`genreNames.${a}`).localeCompare(t(`genreNames.${b}`))
                ).map((genre) => (
                  <CommandItem
                    key={genre}
                    onSelect={() => handleGenreToggle(genre)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        genres.includes(genre) ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {t(`genreNames.${genre}`)}
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
        {genres.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {genres.map((genre) => (
              <Badge key={genre} variant="outline" className={`text-xs ${getGenreColor(genre)}`}>
                {t(`genreNames.${genre}`)}
                <button
                  type="button"
                  onClick={() => handleGenreToggle(genre)}
                  className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
        {errors.genres && (
          <p className="text-sm text-red-500">{errors.genres}</p>
        )}
      </div>
    </>
  );
};

export default SongFormFields;
