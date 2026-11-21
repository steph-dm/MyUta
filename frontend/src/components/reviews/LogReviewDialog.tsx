import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useApolloClient, useMutation } from "@apollo/client";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Camera, Loader2, Upload } from "lucide-react";
import { EXTRACT_REVIEW, LOG_REVIEW } from "@/graphql/reviews";
import { ARTIST_OPTIONS, ARTIST_SONG_OPTIONS } from "@/graphql/library";
import type { MachineType } from "@/gql/graphql";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/shared";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import SongFormFields, { type SongExtras } from "@/components/songs/SongFormFields";
import { useAuth } from "@/contexts/AuthContext";
import { useServerInfo } from "@/hooks/useServerInfo";
import { trackEvent } from "@/lib/analytics";
import { errorMessage, fieldErrors } from "@/lib/errors";
import { normalizeKey } from "@/lib/text";
import { uploadMutation } from "@/lib/upload";
import { isValidYouTubeUrl } from "@/lib/youtube";
import { MACHINE_TYPES } from "@/lib/machines";
import AttachedImage, { type AttachmentStatus } from "./AttachedImage";
import { heicToJpeg, isHeicFile } from "@/lib/heic";

interface Attachment {
  file: File;
  status: AttachmentStatus;
  /** Received from the Android Share menu (read only when the user asks). */
  fromShare?: boolean;
  /** A HEIC photo that could not be converted. */
  convertFailed?: boolean;
}

/** Converts HEIC/HEIF to JPEG; other images are returned unchanged. Null when conversion fails. */
async function prepareImage(file: File): Promise<File | null> {
  if (!(await isHeicFile(file))) return file;
  try {
    return await heicToJpeg(file);
  } catch {
    return null;
  }
}
import ReviewFields from "./ReviewFields";
import { ArtistCombobox, SongCombobox, type ArtistChoice, type SongChoice } from "./pickers";
import {
  emptyReview,
  toReviewInput,
  validateReview,
  type ReviewErrors,
  type ReviewFormValues,
} from "./form";

/** Lists refreshed after a take is saved (server-paginated, so refetching is required). */
export const REVIEW_LISTS = [
  "Reviews",
  "Dashboard",
  "Song",
  "Songs",
  "Artist",
  "Artists",
  "Favorites",
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-selects a song (when opened from a song or artist page). */
  preset?: { artist: ArtistChoice; song?: SongChoice };
  /** Photo to attach when the dialog opens (e.g. received from the Android Share menu). */
  initialImage?: File | null;
}

const emptyExtras: SongExtras = { genres: [], youtubeUrl: "", generatedYoutube: false };

/** Log a take: pick or add artist and song, enter the result; saved in one transaction. */
export default function LogReviewDialog(props: Props) {
  // Each opening starts a fresh form (remount), without resetting state in an effect.
  const [session, setSession] = useState(0);
  const [wasOpen, setWasOpen] = useState(props.open);
  if (props.open !== wasOpen) {
    setWasOpen(props.open);
    if (props.open) setSession((n) => n + 1);
  }
  return <LogReviewForm key={session} {...props} />;
}

function LogReviewForm({ open, onOpenChange, preset, initialImage }: Props) {
  const { t } = useTranslation("reviews");
  const { user } = useAuth();
  const client = useApolloClient();
  const { ocrEnabled, maxUploadBytes } = useServerInfo();
  const id = useId();
  const defaultMachine: MachineType = user?.defaultMachineType ?? MACHINE_TYPES[0]!;

  const [artist, setArtist] = useState<ArtistChoice | null>(preset?.artist ?? null);
  const [song, setSong] = useState<SongChoice | null>(preset?.song ?? null);
  const [extras, setExtras] = useState<SongExtras>(emptyExtras);
  const [review, setReview] = useState<ReviewFormValues>(() => emptyReview(defaultMachine));
  const [errors, setErrors] = useState<ReviewErrors>({});
  const [dirty, setDirty] = useState(!!initialImage);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [attachment, setAttachment] = useState<Attachment | null>(() =>
    initialImage ? { file: initialImage, status: "converting", fromShare: true } : null,
  );
  const reading = attachment?.status === "reading" || attachment?.status === "converting";
  // A shared photo is checked (and converted from HEIC) once when the dialog opens.
  const preparedShare = useRef(false);
  useEffect(() => {
    if (!initialImage || preparedShare.current) return;
    preparedShare.current = true;
    void prepareImage(initialImage).then((file) => {
      setAttachment(
        file
          ? { file, status: "attached", fromShare: true }
          : { file: initialImage, status: "failed", fromShare: true, convertFailed: true },
      );
    });
  }, [initialImage]);
  const tooLarge = !!attachment && attachment.file.size > maxUploadBytes;
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const [logReview, { loading }] = useMutation(LOG_REVIEW, { refetchQueries: REVIEW_LISTS });

  const isNewSong = !!song && !song.id;
  const touch = () => setDirty(true);

  /** Changing the artist (by the user) clears the song; OCR sets both together instead. */
  const chooseArtist = (a: ArtistChoice) => {
    touch();
    setArtist(a);
    if (a.id !== artist?.id || a.name !== artist?.name) setSong(null);
    setErrors((e) => ({ ...e, artist: undefined, song: undefined }));
  };

  /** A photo chosen with the buttons is attached (HEIC converted) and read right away. */
  const pickImage = async (e: ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    e.target.value = "";
    if (!picked) return;
    setDirty(true);
    if (!picked.type.startsWith("image/") && !(await isHeicFile(picked))) {
      toast.error(t("photo.notImage"));
      return;
    }
    setAttachment({ file: picked, status: "converting" });
    const file = await prepareImage(picked);
    if (!file) {
      setAttachment({ file: picked, status: "failed", convertFailed: true });
      return;
    }
    setAttachment({ file, status: "attached" });
    if (file.size <= maxUploadBytes) void readImage(file);
  };

  const readImage = async (file: File) => {
    setAttachment((a) => ({ ...a, file, status: "reading" }));
    try {
      const { extractReviewFromImage: r } = await uploadMutation(EXTRACT_REVIEW, {}, "image", file);
      trackEvent({ name: "extract_review_from_image" });
      // Match the artist and song against the library (case, width and kana-insensitive).
      const names = [r.artistName, r.artistNameAlt].filter(Boolean) as string[];
      let matchedArtist: ArtistChoice | null = null;
      for (const name of names) {
        const { data } = await client.query({ query: ARTIST_OPTIONS, variables: { search: name } });
        const hit = data.artists.items.find((a) => normalizeKey(a.name) === normalizeKey(name));
        if (hit) {
          matchedArtist = { id: hit.id, name: hit.name };
          break;
        }
      }
      let matchedSong: SongChoice | null = null;
      if (matchedArtist?.id) {
        const { data } = await client.query({
          query: ARTIST_SONG_OPTIONS,
          variables: { id: matchedArtist.id },
        });
        const titles = [r.songTitle, r.songTitleAlt]
          .filter(Boolean)
          .map((s) => normalizeKey(s as string));
        const hit = data.artist?.songs.find((s) => titles.includes(normalizeKey(s.title)));
        if (hit)
          matchedSong = {
            id: hit.id,
            title: hit.title,
            genres: hit.genres,
            youtubeUrl: hit.youtubeUrl,
          };
      }
      setArtist(matchedArtist ?? { name: r.artistName });
      setSong(matchedSong ?? { title: r.songTitle });
      setExtras((x) => ({ ...x, genres: r.genres.length ? r.genres : x.genres }));
      setReview((v) => ({
        ...v,
        score: r.score != null ? r.score.toFixed(3) : v.score,
        date: r.date ?? v.date,
        machineType: r.machineType ?? v.machineType,
        issues: r.issues.length ? r.issues : v.issues,
        notes: r.notes ?? v.notes,
        details: r.details
          ? Object.fromEntries(
              Object.entries(r.details)
                .filter(([k, val]) => k !== "__typename" && val != null)
                .map(([k, val]) => [k, String(val)]),
            )
          : v.details,
      }));
      setDirty(true);
      setAttachment((a) => ({ ...a, file, status: "read" }));
      toast.success(r.machineType ? t("log.ocrDone") : t("log.ocrMachineUnknown"));
    } catch (err) {
      setAttachment((a) => ({ ...a, file, status: "failed" }));
      toast.error(errorMessage(err, t));
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: ReviewErrors = validateReview(review, t);
    if (!artist) next.artist = t("validation.artist");
    if (!song) next.song = t("validation.song");
    if (isNewSong && extras.genres.length === 0) next.genres = t("validation.genre");
    if (isNewSong && extras.youtubeUrl.trim() && !isValidYouTubeUrl(extras.youtubeUrl))
      next.youtubeUrl = t("common:errors.reasons.INVALID_YOUTUBE_URL");
    setErrors(next);
    if (Object.keys(next).length) return;
    try {
      await logReview({
        variables: {
          song: song!.id
            ? { songId: song!.id }
            : {
                song: {
                  title: song!.title,
                  artistName: artist!.name,
                  genres: extras.genres,
                  youtubeUrl: extras.youtubeUrl.trim() || null,
                  generatedYoutube: extras.generatedYoutube,
                },
              },
          review: toReviewInput(review),
        },
      });
      trackEvent({
        name: "add_review",
        data: { machineType: review.machineType, fromScreenshot: false },
      });
      toast.success(t("toast.added"));
      setDirty(false);
      onOpenChange(false);
    } catch (err) {
      setErrors({ ...fieldErrors(err, t), form: errorMessage(err, t) });
    }
  };

  const requestClose = (o: boolean) => {
    if (!o && dirty) setConfirmDiscard(true);
    else onOpenChange(o);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={requestClose}>
        <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div>
                <DialogTitle>{t("log.title")}</DialogTitle>
                <DialogDescription>{t("log.description")}</DialogDescription>
              </div>
              {ocrEnabled && (
                <div className="flex gap-2 sm:mr-6">
                  <input
                    ref={fileInput}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => void pickImage(e)}
                  />
                  <input
                    ref={cameraInput}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => void pickImage(e)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={reading}
                    onClick={() => fileInput.current?.click()}
                    className="gap-2"
                  >
                    {reading ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Upload className="h-4 w-4" aria-hidden="true" />
                    )}
                    {reading ? t("log.reading") : t("log.importShot")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={reading}
                    onClick={() => cameraInput.current?.click()}
                    className="gap-2 sm:hidden"
                  >
                    <Camera className="h-4 w-4" aria-hidden="true" />
                    {t("log.takePhoto")}
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>

          <form onSubmit={submit} onChange={touch} className="space-y-4" noValidate>
            {attachment && (
              <AttachedImage
                file={attachment.file}
                status={attachment.status}
                canRead={ocrEnabled && !tooLarge && !attachment.convertFailed}
                message={
                  attachment.convertFailed
                    ? t("photo.convertFailed")
                    : tooLarge
                      ? t("photo.tooLarge", { maxMb: Math.round(maxUploadBytes / 1048576) })
                      : !ocrEnabled
                        ? t("photo.ocrDisabled")
                        : attachment.status === "attached" && attachment.fromShare
                          ? t("photo.shared")
                          : undefined
                }
                onRead={() => void readImage(attachment.file)}
                onRemove={() => setAttachment(null)}
              />
            )}
            {errors.form && (
              <div
                role="alert"
                className="text-sm text-destructive bg-destructive/10 p-3 rounded-md"
              >
                {errors.form}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor={`${id}-artist`}>{t("log.artist")}</Label>
                <ArtistCombobox
                  id={`${id}-artist`}
                  value={artist}
                  onSelect={chooseArtist}
                  invalid={!!errors.artist}
                  describedBy={errors.artist ? `${id}-artist-error` : undefined}
                />
                <FieldError id={`${id}-artist-error`} message={errors.artist} />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${id}-song`}>{t("log.song")}</Label>
                <SongCombobox
                  id={`${id}-song`}
                  artistId={artist?.id}
                  value={song}
                  disabled={!artist}
                  onSelect={(s) => {
                    touch();
                    setSong(s);
                    setErrors((e) => ({ ...e, song: undefined }));
                  }}
                  invalid={!!errors.song}
                  describedBy={errors.song ? `${id}-song-error` : undefined}
                />
                <FieldError id={`${id}-song-error`} message={errors.song} />
              </div>
            </div>
            {isNewSong && (
              <SongFormFields
                value={extras}
                onChange={(v) => {
                  touch();
                  setExtras(v);
                }}
                artistName={artist?.name ?? ""}
                title={song?.title ?? ""}
                errors={{ genres: errors.genres, youtubeUrl: errors.youtubeUrl }}
              />
            )}
            <ReviewFields
              value={review}
              onChange={(v) => {
                touch();
                setReview(v);
              }}
              errors={errors}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => requestClose(false)}>
                {t("common:actions.cancel")}
              </Button>
              <Button type="submit" disabled={loading || reading}>
                {loading ? t("log.submitting") : t("log.submit")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title={t("common:confirm.discardTitle")}
        description={t("common:confirm.discardDesc")}
        confirmLabel={t("common:confirm.discard")}
        cancelLabel={t("common:confirm.keepEditing")}
        destructive
        onConfirm={() => {
          setConfirmDiscard(false);
          setDirty(false);
          onOpenChange(false);
        }}
      />
    </>
  );
}
