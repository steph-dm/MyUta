import { useId, useState, type FormEvent } from "react";
import { useMutation } from "@apollo/client";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { UPDATE_SONG } from "@/graphql/library";
import type { SongSummaryFragment } from "@/gql/graphql";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/shared";
import { REVIEW_LISTS } from "@/components/reviews/LogReviewDialog";
import { trackEvent } from "@/lib/analytics";
import { errorMessage, fieldErrors } from "@/lib/errors";
import { isValidYouTubeUrl } from "@/lib/youtube";
import SongFormFields, { type SongExtras } from "./SongFormFields";

type Errors = Partial<Record<"title" | "artistName" | "genres" | "youtubeUrl" | "form", string>>;

export default function EditSongDialog({
  song,
  onClose,
}: {
  song: SongSummaryFragment | null;
  onClose: () => void;
}) {
  return song ? <EditSongForm key={song.id} song={song} onClose={onClose} /> : null;
}

function EditSongForm({ song, onClose }: { song: SongSummaryFragment; onClose: () => void }) {
  const { t } = useTranslation("songs");
  const id = useId();
  const [title, setTitle] = useState(song.title);
  const [artistName, setArtistName] = useState(song.artist.name);
  const [extras, setExtras] = useState<SongExtras>({
    genres: [...song.genres],
    youtubeUrl: song.youtubeUrl ?? "",
    generatedYoutube: song.generatedYoutube,
  });
  const [errors, setErrors] = useState<Errors>({});
  const [update, { loading }] = useMutation(UPDATE_SONG, { refetchQueries: REVIEW_LISTS });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: Errors = {};
    if (!title.trim()) next.title = t("common:errors.reasons.TITLE_LENGTH");
    if (!artistName.trim()) next.artistName = t("common:errors.reasons.ARTIST_NAME_LENGTH");
    if (extras.genres.length === 0) next.genres = t("reviews:validation.genre");
    if (extras.youtubeUrl.trim() && !isValidYouTubeUrl(extras.youtubeUrl))
      next.youtubeUrl = t("common:errors.reasons.INVALID_YOUTUBE_URL");
    setErrors(next);
    if (Object.keys(next).length) return;
    try {
      await update({
        variables: {
          id: song.id,
          input: {
            title: title.trim(),
            artistName: artistName.trim(),
            genres: extras.genres,
            youtubeUrl: extras.youtubeUrl.trim() || null,
            generatedYoutube: extras.generatedYoutube,
          },
        },
      });
      trackEvent({ name: "edit_song" });
      toast.success(t("edit.saved"));
      onClose();
    } catch (err) {
      setErrors({ ...fieldErrors(err, t), form: errorMessage(err, t) });
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("edit.title")}</DialogTitle>
          <DialogDescription>{t("edit.description")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" noValidate>
          {errors.form && (
            <div role="alert" className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {errors.form}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor={`${id}-title`}>{t("form.title")}</Label>
            <Input
              id={`${id}-title`}
              value={title}
              maxLength={200}
              onChange={(e) => setTitle(e.target.value)}
              aria-invalid={!!errors.title}
              aria-describedby={errors.title ? `${id}-title-error` : undefined}
            />
            <FieldError id={`${id}-title-error`} message={errors.title} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${id}-artist`}>{t("form.artist")}</Label>
            <Input
              id={`${id}-artist`}
              value={artistName}
              maxLength={200}
              onChange={(e) => setArtistName(e.target.value)}
              aria-invalid={!!errors.artistName}
              aria-describedby={errors.artistName ? `${id}-artist-error` : undefined}
            />
            <FieldError id={`${id}-artist-error`} message={errors.artistName} />
          </div>
          <SongFormFields
            value={extras}
            onChange={setExtras}
            artistName={artistName}
            title={title}
            errors={errors}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t("common:actions.cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t("common:actions.saving") : t("common:actions.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
