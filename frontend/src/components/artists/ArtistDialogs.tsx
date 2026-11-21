import { useId, useState, type FormEvent } from "react";
import { useMutation } from "@apollo/client";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { DELETE_ARTIST, MERGE_ARTISTS, UPDATE_ARTIST } from "@/graphql/library";
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
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { REVIEW_LISTS } from "@/components/reviews/LogReviewDialog";
import { trackEvent } from "@/lib/analytics";
import { apiErrors, errorMessage } from "@/lib/errors";

interface ArtistRef {
  id: string;
  name: string;
}

/** Rename; if the name is taken, offer to merge into the existing artist. */
interface EditArtistProps {
  artist: ArtistRef | null;
  onClose: () => void;
  onMerged?: (targetId: string) => void;
}

export function EditArtistDialog(props: EditArtistProps) {
  return props.artist ? (
    <EditArtistForm key={props.artist.id} {...props} artist={props.artist} />
  ) : null;
}

function EditArtistForm({ artist, onClose, onMerged }: EditArtistProps & { artist: ArtistRef }) {
  const { t } = useTranslation("artists");
  const id = useId();
  const [name, setName] = useState(artist.name);
  const [error, setError] = useState<string>();
  const [mergeTarget, setMergeTarget] = useState<ArtistRef | null>(null);
  const [update, { loading }] = useMutation(UPDATE_ARTIST, { refetchQueries: REVIEW_LISTS });
  const [merge, { loading: merging }] = useMutation(MERGE_ARTISTS, {
    refetchQueries: REVIEW_LISTS,
  });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t("common:errors.reasons.ARTIST_NAME_LENGTH"));
      return;
    }
    if (name.trim() === artist.name) return onClose();
    try {
      await update({ variables: { id: artist.id, name: name.trim() } });
      trackEvent({ name: "edit_artist" });
      toast.success(t("edit.saved"));
      onClose();
    } catch (err) {
      const e0 = apiErrors(err)[0];
      if (e0?.reason === "ARTIST_EXISTS" && typeof e0.extensions.existingArtistId === "string") {
        setMergeTarget({
          id: e0.extensions.existingArtistId,
          name: String(e0.extensions.existingArtistName ?? name),
        });
      } else {
        setError(errorMessage(err, t));
      }
    }
  };

  const doMerge = async () => {
    if (!mergeTarget) return;
    try {
      await merge({ variables: { sourceId: artist.id, targetId: mergeTarget.id } });
      trackEvent({ name: "merge_artists" });
      toast.success(t("merge.done"));
      setMergeTarget(null);
      onClose();
      onMerged?.(mergeTarget.id);
    } catch (err) {
      toast.error(errorMessage(err, t));
    }
  };

  return (
    <>
      <Dialog open={!mergeTarget} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{t("edit.title")}</DialogTitle>
            <DialogDescription>{artist.name}</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor={`${id}-name`}>{t("edit.name")}</Label>
              <Input
                id={`${id}-name`}
                value={name}
                maxLength={200}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(undefined);
                }}
                aria-invalid={!!error}
                aria-describedby={error ? `${id}-error` : undefined}
                autoFocus
              />
              <FieldError id={`${id}-error`} message={error} />
            </div>
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
      <ConfirmDialog
        open={!!mergeTarget}
        onOpenChange={(o) => !o && setMergeTarget(null)}
        title={t("merge.title", { name: mergeTarget?.name })}
        description={t("merge.description", { name: mergeTarget?.name })}
        confirmLabel={t("merge.confirm")}
        busy={merging}
        onConfirm={() => void doMerge()}
      />
    </>
  );
}

/** Deletes an artist with its songs and takes after confirming the counts. */
export function DeleteArtistDialog({
  artist,
  onClose,
  onDeleted,
}: {
  artist: (ArtistRef & { songCount: number; reviewCount: number }) | null;
  onClose: () => void;
  onDeleted?: () => void;
}) {
  const { t } = useTranslation("artists");
  const [remove, { loading }] = useMutation(DELETE_ARTIST, { refetchQueries: REVIEW_LISTS });
  return (
    <ConfirmDialog
      open={!!artist}
      onOpenChange={(o) => !o && onClose()}
      title={t("delete.title", { name: artist?.name })}
      description={t("delete.description", {
        songs: artist?.songCount ?? 0,
        reviews: artist?.reviewCount ?? 0,
      })}
      confirmLabel={loading ? t("common:actions.deleting") : t("common:actions.delete")}
      destructive
      busy={loading}
      onConfirm={async () => {
        if (!artist) return;
        try {
          await remove({ variables: { id: artist.id } });
          trackEvent({ name: "delete_artist" });
          toast.success(t("delete.done"));
          onClose();
          onDeleted?.();
        } catch (err) {
          toast.error(errorMessage(err, t));
        }
      }}
    />
  );
}
