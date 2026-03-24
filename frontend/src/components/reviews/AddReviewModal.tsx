import { useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useLazyQuery } from "@apollo/client";
import {
  UPSERT_REVIEW,
  UPSERT_ARTIST,
  UPSERT_SONG,
  GET_ARTISTS_WITH_STATS,
  GET_ARTIST_SONGS,
  ME,
  EXTRACT_REVIEW_FROM_IMAGE,
  SEARCH_YOUTUBE,
} from "../../graphql/queries";
import type { ArtistWithStats, Genre, Issue, MachineType } from "../../types";
import { ISSUE_OPTIONS, MACHINE_TYPES } from "../../types";
import { useReviewFormState } from "../../hooks/useReviewFormState";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../../components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Badge } from "../../components/ui/badge";
import { Check, ChevronsUpDown, Plus, X, Upload, Loader2 } from "lucide-react";
import { cn, getIssueColor, getMachineButtonColor } from "../../lib/utils";
import { trackEvent } from "../../lib/analytics";
import { compressImage } from "../../lib/image";
import SongFormFields from "../songs/SongFormFields";

interface Song {
  id: string;
  title: string;
  youtubeUrl?: string;
  generatedYoutube: boolean;
}

interface AddReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReviewAdded: () => void;
  userId: string;
}

const AddReviewModal = ({
  isOpen,
  onClose,
  onReviewAdded,
  userId: _userId,
}: AddReviewModalProps) => {
  const { state, setField, reset, setErrors, toggleIssue, applyOcrData } =
    useReviewFormState();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation("reviews");

  const { data: meData } = useQuery(ME);
  const { data: artistsData, refetch: refetchArtists } = useQuery(
    GET_ARTISTS_WITH_STATS,
  );
  const [getArtistSongs, { data: songsData }] = useLazyQuery(GET_ARTIST_SONGS, {
    fetchPolicy: "network-only",
  });

  const [upsertArtist] = useMutation(UPSERT_ARTIST);
  const [upsertSong] = useMutation(UPSERT_SONG);
  const [upsertReview] = useMutation(UPSERT_REVIEW);
  const [extractReview] = useMutation(EXTRACT_REVIEW_FROM_IMAGE);
  const [searchYoutube] = useLazyQuery(SEARCH_YOUTUBE, {
    fetchPolicy: "network-only",
  });

  useEffect(() => {
    if (meData?.me?.defaultMachineType) {
      setField("machineType", meData.me.defaultMachineType as MachineType);
    }
  }, [meData, setField]);

  useEffect(() => {
    if (state.selectedArtist && !state.isCreatingNewArtist) {
      getArtistSongs({ variables: { id: state.selectedArtist.id } });
      setField("selectedSong", null);
      setField("isCreatingNewSong", false);
      setField("newSongTitle", "");
    }
  }, [state.selectedArtist, state.isCreatingNewArtist, getArtistSongs, setField]);

  useEffect(() => {
    if (isOpen) {
      refetchArtists();
    } else {
      reset(meData?.me?.defaultMachineType);
    }
  }, [isOpen, refetchArtists, reset, meData?.me?.defaultMachineType]);

  const handleScreenshotImport = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      e.target.value = "";
      setField("isExtracting", true);
      setErrors({});

      try {
        const base64 = await compressImage(file);

        const { data } = await extractReview({
          variables: { imageBase64: base64 },
        });

        const extracted = data?.extractReviewFromImage;
        if (!extracted) {
          throw new Error("No data returned");
        }

        const artistAlt = extracted.artistNameAlt || null;
        const songAlt = extracted.songTitleAlt || null;

        const artists: ArtistWithStats[] = artistsData?.artists || [];
        const artistSearchTerms = [extracted.artistName, artistAlt]
          .filter(Boolean)
          .map((s: string) => s.toLowerCase().trim());
        const matchedArtist = artists.find((a) => {
          const terms = [a.name].map((s) =>
            s.toLowerCase().trim(),
          );
          return artistSearchTerms.some((t) => terms.includes(t));
        });

        let ocrPayload: Partial<typeof state> = {
          score: extracted.score.toFixed(3),
          date: extracted.date,
          machineType: extracted.machineType as MachineType,
        };

        if (extracted.notes) ocrPayload.notes = extracted.notes;
        if (extracted.genres?.length > 0)
          ocrPayload.newSongGenres = extracted.genres as Genre[];
        if (extracted.issues?.length > 0)
          ocrPayload.issues = extracted.issues as Issue[];

        if (matchedArtist) {
          ocrPayload = {
            ...ocrPayload,
            selectedArtist: matchedArtist,
            isCreatingNewArtist: false,
            newArtistName: "",
          };

          const { data: songsFetched } = await getArtistSongs({
            variables: { id: matchedArtist.id },
          });
          const artistSongs: Song[] = songsFetched?.artist?.songs || [];
          const songSearchTerms = [extracted.songTitle, songAlt]
            .filter(Boolean)
            .map((s: string) => s.toLowerCase().trim());
          const matchedSong = artistSongs.find((s) => {
            const terms = [s.title].map((t) =>
              t.toLowerCase().trim(),
            );
            return songSearchTerms.some((t) => terms.includes(t));
          });
          if (matchedSong) {
            ocrPayload.selectedSong = matchedSong;
            ocrPayload.isCreatingNewSong = false;
          } else {
            ocrPayload.isCreatingNewSong = true;
            ocrPayload.newSongTitle = extracted.songTitle;
          }
        } else {
          ocrPayload = {
            ...ocrPayload,
            isCreatingNewArtist: true,
            newArtistName: extracted.artistName,
            isCreatingNewSong: true,
            newSongTitle: extracted.songTitle,
          };
        }

        applyOcrData(ocrPayload);

        trackEvent({ name: "extract_review_from_image" });

        const artistForSearch = matchedArtist
          ? matchedArtist.name
          : extracted.artistName;
        const songForSearch = extracted.songTitle;
        if (artistForSearch && songForSearch) {
          try {
            const { data: ytData } = await searchYoutube({
              variables: { artist: artistForSearch, song: songForSearch },
            });
            const results = ytData?.searchYoutube;
            if (results?.length > 0) {
              const topResult = results[0];
              setField(
                "newSongYoutubeUrl",
                `https://www.youtube.com/watch?v=${topResult.videoId}`,
              );
              setField("generatedYoutube", true);
            }
          } catch {
            // YouTube search is optional, don't fail the import
          }
        }
      } catch {
        toast.error(t("toast.screenshotFailed"));
        setErrors({
          submit: t("modal.screenshotError"),
        });
      } finally {
        setField("isExtracting", false);
      }
    },
    [
      extractReview,
      artistsData,
      getArtistSongs,
      searchYoutube,
      setField,
      setErrors,
      applyOcrData,
    ],
  );

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!state.selectedArtist && !state.isCreatingNewArtist) {
      newErrors.artist = t("validation.selectArtist");
    }
    if (state.isCreatingNewArtist && !state.newArtistName.trim()) {
      newErrors.artist = t("validation.enterArtist");
    }

    if (!state.selectedSong && !state.isCreatingNewSong) {
      newErrors.song = t("validation.selectSong");
    }
    if (state.isCreatingNewSong && !state.newSongTitle.trim()) {
      newErrors.song = t("validation.enterSong");
    }
    if (state.isCreatingNewSong && state.newSongGenres.length === 0) {
      newErrors.genres = t("validation.selectGenre");
    }

    if (!state.score) {
      newErrors.score = t("validation.enterScore");
    } else {
      const scoreNum = parseFloat(state.score);
      if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
        newErrors.score = t("validation.scoreRange");
      }
    }

    if (!state.date) newErrors.date = t("validation.selectDate");

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [state, setErrors]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validateForm()) return;

      setField("isSubmitting", true);
      try {
        let artistId = state.selectedArtist?.id;
        let songId = state.selectedSong?.id;

        if (state.isCreatingNewArtist && state.newArtistName.trim()) {
          const { data: artistData } = await upsertArtist({
            variables: { name: state.newArtistName.trim() },
          });
          artistId = artistData.upsertArtist.id;
          trackEvent({ name: "add_artist", data: { name: state.newArtistName.trim() } });
        }

        if (state.isCreatingNewSong && state.newSongTitle.trim() && artistId) {
          const { data: songData } = await upsertSong({
            variables: {
              title: state.newSongTitle.trim(),
              artistId,
              youtubeUrl: state.newSongYoutubeUrl.trim() || null,
              generatedYoutube: state.generatedYoutube,
              genres: state.newSongGenres,
            },
          });
          songId = songData.upsertSong.id;
          trackEvent({ name: "add_song", data: { title: state.newSongTitle.trim() } });
        }

        if (artistId && songId) {
          await upsertReview({
            variables: {
              songId,
              date: state.date,
              score: parseFloat(state.score),
              machineType: state.machineType,
              issues: state.issues,
              notes: state.notes.trim() || null,
            },
          });
          onReviewAdded();
          onClose();
          toast(t("toast.added"));
          trackEvent({ name: "add_review", data: { machineType: state.machineType, songTitle: state.isCreatingNewSong ? state.newSongTitle : (state.selectedSong?.title || "") } });
        }
      } catch {
        toast.error(t("toast.saveFailed"));
        setErrors({ submit: t("toast.saveFailed") });
      } finally {
        setField("isSubmitting", false);
      }
    },
    [
      state,
      validateForm,
      upsertArtist,
      upsertSong,
      upsertReview,
      onReviewAdded,
      onClose,
      setErrors,
    ],
  );

  const artists: ArtistWithStats[] = artistsData?.artists || [];
  const songs: Song[] = songsData?.artist?.songs || [];

  const artistSearchMatchesExisting = artists.some((a) => {
    const terms = [a.name].map((s) =>
      s.toLowerCase().trim(),
    );
    return terms.includes(state.artistSearch.toLowerCase().trim());
  });
  const songSearchMatchesExisting = songs.some((s) => {
    const terms = [s.title].map((t) =>
      t.toLowerCase().trim(),
    );
    return terms.includes(state.songSearch.toLowerCase().trim());
  });

  const artistDisplayText = state.isCreatingNewArtist
    ? state.newArtistName
    : state.selectedArtist
      ? state.selectedArtist.name
      : "";

  const songDisplayText = state.isCreatingNewSong
    ? state.newSongTitle
    : state.selectedSong
      ? state.selectedSong.title
      : "";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <DialogTitle>{t("modal.addTitle")}</DialogTitle>
              <DialogDescription>
                {t("modal.addDescription")}
              </DialogDescription>
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleScreenshotImport}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={state.isExtracting}
                className="gap-2"
              >
                {state.isExtracting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("modal.extracting")}
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    {t("modal.import")}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label>{t("modal.artist")}</Label>
            <Popover
              open={state.artistOpen}
              onOpenChange={(open) => setField("artistOpen", open)}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={state.artistOpen}
                  className={cn(
                    "w-full justify-between",
                    state.errors.artist && "border-red-500",
                  )}
                >
                  {artistDisplayText || t("modal.artistPlaceholder")}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[--radix-popover-trigger-width] p-0"
                align="start"
              >
                <Command shouldFilter={true}>
                  <CommandInput
                    placeholder={t("modal.searchArtist")}
                    value={state.artistSearch}
                    onValueChange={(v) => setField("artistSearch", v)}
                  />
                  <CommandList>
                    <CommandEmpty>{t("modal.noArtists")}</CommandEmpty>
                    <CommandGroup>
                      {artists.map((artist) => (
                        <CommandItem
                          key={artist.id}
                          value={artist.name}
                          onSelect={() => {
                            applyOcrData({
                              selectedArtist: artist,
                              isCreatingNewArtist: false,
                              newArtistName: "",
                              artistOpen: false,
                              artistSearch: "",
                              errors: { ...state.errors, artist: "" },
                            });
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              state.selectedArtist?.id === artist.id &&
                                !state.isCreatingNewArtist
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                          {artist.name}
                          <span className="ml-auto text-xs text-muted-foreground">
                            {t("modal.songCount", { count: artist.songCount })}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                  {state.artistSearch.trim() &&
                    !artistSearchMatchesExisting && (
                      <div className="border-t p-1">
                        <button
                          type="button"
                          className="flex items-center gap-2 w-full rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
                          onClick={() => {
                            applyOcrData({
                              isCreatingNewArtist: true,
                              newArtistName: state.artistSearch.trim(),
                              selectedArtist: null,
                              selectedSong: null,
                              isCreatingNewSong: false,
                              artistOpen: false,
                              artistSearch: "",
                              errors: { ...state.errors, artist: "" },
                            });
                          }}
                        >
                          <Plus className="h-4 w-4" />
                          {t("modal.createArtist", { name: state.artistSearch.trim() })}
                        </button>
                      </div>
                    )}
                </Command>
              </PopoverContent>
            </Popover>
            {state.isCreatingNewArtist && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline" className="text-xs bg-primary/10">
                  {t("modal.new")}
                </Badge>
                {state.newArtistName}
                <button
                  type="button"
                  onClick={() => {
                    setField("isCreatingNewArtist", false);
                    setField("newArtistName", "");
                  }}
                  className="ml-auto text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            {state.errors.artist && (
              <p className="text-sm text-red-500">{state.errors.artist}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>{t("modal.song")}</Label>
            <Popover
              open={state.songOpen}
              onOpenChange={(open) => setField("songOpen", open)}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={state.songOpen}
                  className={cn(
                    "w-full justify-between",
                    state.errors.song && "border-red-500",
                  )}
                  disabled={
                    !state.selectedArtist && !state.isCreatingNewArtist
                  }
                >
                  {songDisplayText || t("modal.songPlaceholder")}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[--radix-popover-trigger-width] p-0"
                align="start"
              >
                <Command shouldFilter={true}>
                  <CommandInput
                    placeholder={t("modal.searchSong")}
                    value={state.songSearch}
                    onValueChange={(v) => setField("songSearch", v)}
                  />
                  <CommandList>
                    <CommandEmpty>{t("modal.noSongs")}</CommandEmpty>
                    {!state.isCreatingNewArtist && songs.length > 0 && (
                      <CommandGroup>
                        {songs.map((song) => (
                          <CommandItem
                            key={song.id}
                            value={song.title}
                            onSelect={() => {
                              applyOcrData({
                                selectedSong: song,
                                isCreatingNewSong: false,
                                newSongTitle: "",
                                songOpen: false,
                                songSearch: "",
                                errors: { ...state.errors, song: "" },
                              });
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                state.selectedSong?.id === song.id &&
                                  !state.isCreatingNewSong
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                            {song.title}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </CommandList>
                  {state.songSearch.trim() && !songSearchMatchesExisting && (
                    <div className="border-t p-1">
                      <button
                        type="button"
                        className="flex items-center gap-2 w-full rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
                        onClick={() => {
                          applyOcrData({
                            isCreatingNewSong: true,
                            newSongTitle: state.songSearch.trim(),
                            selectedSong: null,
                            songOpen: false,
                            songSearch: "",
                            errors: { ...state.errors, song: "" },
                          });
                        }}
                      >
                        <Plus className="h-4 w-4" />
                        {t("modal.createSong", { name: state.songSearch.trim() })}
                      </button>
                    </div>
                  )}
                </Command>
              </PopoverContent>
            </Popover>
            {state.isCreatingNewSong && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="outline" className="text-xs bg-primary/10">
                    {t("modal.new")}
                  </Badge>
                  {state.newSongTitle}
                  <button
                    type="button"
                    onClick={() => {
                      setField("isCreatingNewSong", false);
                      setField("newSongTitle", "");
                    }}
                    className="ml-auto text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <SongFormFields
                  title={state.newSongTitle}
                  onTitleChange={(v) => setField("newSongTitle", v)}
                  youtubeUrl={state.newSongYoutubeUrl}
                  onYoutubeUrlChange={(url, generated) => {
                    setField("newSongYoutubeUrl", url);
                    setField("generatedYoutube", generated);
                  }}
                  genres={state.newSongGenres}
                  onGenresChange={(g) => setField("newSongGenres", g)}
                  artistName={
                    state.isCreatingNewArtist
                      ? state.newArtistName.trim()
                      : state.selectedArtist?.name || ""
                  }
                  errors={state.errors}
                  onClearError={(field) =>
                    setErrors({ ...state.errors, [field]: "" })
                  }
                  showTitle={false}
                />
              </div>
            )}
            {!state.isCreatingNewSong && state.errors.song && (
              <p className="text-sm text-red-500">{state.errors.song}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="date">{t("modal.performanceDate")}</Label>
              <Input
                type="date"
                value={state.date}
                onChange={(e) => {
                  setField("date", e.target.value);
                  setErrors({ ...state.errors, date: "" });
                }}
                className={cn(state.errors.date && "border-red-500")}
              />
              {state.errors.date && (
                <p className="text-sm text-red-500">{state.errors.date}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="score">{t("modal.scoreRange")}</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.001"
                placeholder="85.5"
                value={state.score}
                onChange={(e) => {
                  const value = e.target.value;
                  if (
                    value === "" ||
                    (!isNaN(parseFloat(value)) &&
                      parseFloat(value) >= 0 &&
                      parseFloat(value) <= 100)
                  ) {
                    setField("score", value);
                  }
                }}
                className={cn(state.errors.score && "border-red-500")}
              />
              {state.errors.score && (
                <p className="text-sm text-red-500">{state.errors.score}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="machineType">{t("modal.machineType")}</Label>
              <div className="flex gap-2">
                {MACHINE_TYPES.map((type) => (
                  <Button
                    key={type}
                    type="button"
                    size="sm"
                    variant={
                      state.machineType === type ? "default" : "outline"
                    }
                    className={cn(
                      "flex-1",
                      state.machineType === type && getMachineButtonColor(type),
                    )}
                    onClick={() => setField("machineType", type)}
                  >
                    {type}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="issues">{t("modal.issues")}</Label>
              <Popover
                open={state.issuesOpen}
                onOpenChange={(open) => setField("issuesOpen", open)}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={state.issuesOpen}
                    className="w-full justify-between"
                  >
                    {state.issues.length === 0
                      ? t("modal.noIssueSelected")
                      : t("modal.issuesSelected", { count: state.issues.length })}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder={t("modal.searchIssues")} />
                    <CommandList>
                      <CommandEmpty>{t("modal.noIssuesFound")}</CommandEmpty>
                      <CommandGroup>
                        {[...ISSUE_OPTIONS].sort((a, b) =>
                          t(`issues.${a}`).localeCompare(t(`issues.${b}`))
                        ).map((issue) => (
                          <CommandItem
                            key={issue}
                            onSelect={() => toggleIssue(issue)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                state.issues.includes(issue)
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                            {t(`issues.${issue}`)}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {state.issues.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {state.issues.map((issue) => (
                <Badge
                  key={issue}
                  variant="outline"
                  className={cn("text-xs", getIssueColor(issue))}
                >
                  {t(`issues.${issue}`)}
                  <button
                    type="button"
                    onClick={() => toggleIssue(issue)}
                    className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">{t("modal.notesLabel")}</Label>
            <Textarea
              placeholder={t("modal.notesPlaceholder")}
              value={state.notes}
              onChange={(e) => setField("notes", e.target.value)}
              rows={2}
            />
          </div>

          {state.errors.submit && (
            <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950 p-3 rounded-md">
              {state.errors.submit}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t("modal.cancel")}
            </Button>
            <Button type="submit" disabled={state.isSubmitting || state.isExtracting}>
              {state.isSubmitting ? t("modal.submitting") : t("modal.submit")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddReviewModal;
