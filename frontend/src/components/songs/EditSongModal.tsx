import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useMutation } from "@apollo/client";
import { UPSERT_SONG, UPSERT_ARTIST } from "../../graphql/queries";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import SongFormFields from "./SongFormFields";
import type { Genre } from "../../types";
import { cn } from "../../lib/utils";
import { trackEvent } from "../../lib/analytics";

interface Song {
  id: string;
  title: string;
  genres: string[];
  youtubeUrl?: string;
  generatedYoutube: boolean;
  artist: {
    id: string;
    name: string;
  };
}

interface EditSongModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSongUpdated: () => void;
  song: Song | null;
}

const EditSongModal = ({
  isOpen,
  onClose,
  onSongUpdated,
  song,
}: EditSongModalProps) => {
  const [artistName, setArtistName] = useState("");
  const [title, setTitle] = useState("");
  const [genres, setGenres] = useState<Genre[]>([]);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [generatedYoutube, setGeneratedYoutube] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useTranslation("songs");

  const [upsertSong] = useMutation(UPSERT_SONG);
  const [upsertArtist] = useMutation(UPSERT_ARTIST);

  useEffect(() => {
    if (song) {
      setArtistName(song.artist.name);
      setTitle(song.title);
      setGenres((song.genres || []) as Genre[]);
      setYoutubeUrl(song.youtubeUrl || "");
      setGeneratedYoutube(song.generatedYoutube);
    }
  }, [song]);

  useEffect(() => {
    if (!isOpen) {
      setErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!artistName.trim()) {
      newErrors.artist = t("editSong.validation.enterArtist");
    }

    if (!title.trim()) {
      newErrors.title = t("editSong.validation.enterTitle");
    }

    if (genres.length === 0) {
      newErrors.genres = t("editSong.validation.selectGenre");
    }

    if (youtubeUrl && youtubeUrl.trim()) {
      const youtubeRegex =
        /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)[\w-]+/;
      if (!youtubeRegex.test(youtubeUrl.trim())) {
        newErrors.youtubeUrl = t("editSong.validation.invalidYoutube");
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !song) return;

    setIsSubmitting(true);
    try {
      const { data: artistData } = await upsertArtist({
        variables: { name: artistName.trim() },
      });

      await upsertSong({
        variables: {
          id: song.id,
          title: title.trim(),
          artistId: artistData.upsertArtist.id,
          genres,
          youtubeUrl: youtubeUrl.trim() || null,
          generatedYoutube,
        },
      });
      onSongUpdated();
      onClose();
      toast(t("editSong.toast.saved"));
      trackEvent({ name: "edit_song", data: { title: title.trim() } });
    } catch {
      toast.error(t("editSong.toast.saveFailed"));
      setErrors({ submit: t("editSong.toast.saveError") });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!song) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("editSong.title")}</DialogTitle>
          <DialogDescription>
            {t("editSong.description", {
              song: song.title,
              artist: song.artist.name,
            })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t("editSong.artistLabel")}</Label>
            <Input
              value={artistName}
              onChange={(e) => {
                setArtistName(e.target.value);
                setErrors((prev) => ({ ...prev, artist: "" }));
              }}
              placeholder={t("editSong.artistPlaceholder")}
              className={cn(errors.artist && "border-red-500")}
            />
            {errors.artist && (
              <p className="text-sm text-red-500">{errors.artist}</p>
            )}
          </div>

          <SongFormFields
            title={title}
            onTitleChange={setTitle}
            youtubeUrl={youtubeUrl}
            onYoutubeUrlChange={(url, generated) => {
              setYoutubeUrl(url);
              setGeneratedYoutube(generated);
            }}
            genres={genres}
            onGenresChange={setGenres}
            artistName={artistName}
            errors={errors}
            onClearError={(field) =>
              setErrors((prev) => ({ ...prev, [field]: "" }))
            }
          />

          {errors.submit && (
            <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950 p-3 rounded-md">
              {errors.submit}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              {t("editSong.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t("editSong.submitting") : t("editSong.submit")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditSongModal;
