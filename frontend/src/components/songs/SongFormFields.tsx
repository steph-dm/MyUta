import { useId, useState } from "react";
import { useMutation } from "@apollo/client";
import { useTranslation } from "react-i18next";
import { Loader2, Search } from "lucide-react";
import { SEARCH_YOUTUBE } from "@/graphql/library";
import type { Genre, SearchYoutubeMutation } from "@/gql/graphql";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, GenrePicker } from "@/components/shared";
import { useServerInfo } from "@/hooks/useServerInfo";
import { trackEvent } from "@/lib/analytics";
import { errorMessage } from "@/lib/errors";
import { watchUrl } from "@/lib/youtube";

export interface SongExtras {
  genres: Genre[];
  youtubeUrl: string;
  generatedYoutube: boolean;
}

interface Props {
  value: SongExtras;
  onChange: (v: SongExtras) => void;
  artistName: string;
  title: string;
  errors: { genres?: string; youtubeUrl?: string };
}

/** Genres and YouTube link of a song (with optional YouTube search). */
export default function SongFormFields({ value, onChange, artistName, title, errors }: Props) {
  const { t } = useTranslation("songs");
  const id = useId();
  const { youtubeSearchEnabled } = useServerInfo();
  const [results, setResults] = useState<SearchYoutubeMutation["searchYoutube"] | null>(null);
  const [searchError, setSearchError] = useState<string>();
  const [search, { loading }] = useMutation(SEARCH_YOUTUBE);
  const canSearch = youtubeSearchEnabled && artistName.trim() !== "" && title.trim() !== "";

  const runSearch = async () => {
    setSearchError(undefined);
    try {
      const { data } = await search({
        variables: { artist: artistName.trim(), song: title.trim() },
      });
      trackEvent({ name: "search_youtube" });
      setResults(data?.searchYoutube ?? []);
    } catch (e) {
      setSearchError(errorMessage(e, t));
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${id}-genres`}>{t("form.genres")}</Label>
        <GenrePicker
          id={`${id}-genres`}
          values={value.genres}
          onChange={(genres) => onChange({ ...value, genres })}
          invalid={!!errors.genres}
          describedBy={errors.genres ? `${id}-genres-error` : undefined}
        />
        <FieldError id={`${id}-genres-error`} message={errors.genres} />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${id}-yt`}>{t("form.youtube")}</Label>
        <div className="flex gap-2">
          <Input
            id={`${id}-yt`}
            type="url"
            inputMode="url"
            placeholder="https://www.youtube.com/watch?v=…"
            value={value.youtubeUrl}
            onChange={(e) =>
              onChange({ ...value, youtubeUrl: e.target.value, generatedYoutube: false })
            }
            aria-invalid={!!errors.youtubeUrl}
            aria-describedby={errors.youtubeUrl ? `${id}-yt-error` : undefined}
          />
          {youtubeSearchEnabled && (
            <Button
              type="button"
              variant="outline"
              disabled={!canSearch || loading}
              onClick={runSearch}
              aria-label={t("form.searchYoutube")}
              title={t("form.searchYoutube")}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Search className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
          )}
        </div>
        <FieldError id={`${id}-yt-error`} message={errors.youtubeUrl ?? searchError} />
        {results && (
          <ul className="border rounded-md divide-y max-h-60 overflow-y-auto">
            {results.length === 0 && (
              <li className="p-3 text-sm text-muted-foreground">{t("form.noVideos")}</li>
            )}
            {results.map((r) => (
              <li key={r.videoId}>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 flex items-center gap-3"
                  aria-label={t("form.chooseVideo", { title: r.title })}
                  onClick={() => {
                    onChange({ ...value, youtubeUrl: watchUrl(r.videoId), generatedYoutube: true });
                    setResults(null);
                  }}
                >
                  <img
                    src={r.thumbnailUrl}
                    alt=""
                    className="w-20 h-14 object-cover rounded shrink-0"
                    loading="lazy"
                  />
                  <span className="min-w-0">
                    <span className="block font-medium line-clamp-2">{r.title}</span>
                    <span className="block text-xs text-muted-foreground">
                      {r.channelTitle} · {r.duration}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
