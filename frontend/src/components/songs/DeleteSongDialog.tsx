import { useMutation } from "@apollo/client";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { DELETE_SONG } from "@/graphql/library";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { REVIEW_LISTS } from "@/components/reviews/LogReviewDialog";
import { trackEvent } from "@/lib/analytics";
import { errorMessage } from "@/lib/errors";

export default function DeleteSongDialog({
  song,
  onClose,
  onDeleted,
}: {
  song: { id: string; title: string; reviewCount: number } | null;
  onClose: () => void;
  onDeleted?: () => void;
}) {
  const { t } = useTranslation("songs");
  const [remove, { loading }] = useMutation(DELETE_SONG, { refetchQueries: REVIEW_LISTS });
  return (
    <ConfirmDialog
      open={!!song}
      onOpenChange={(o) => !o && onClose()}
      title={t("delete.title", { title: song?.title })}
      description={t("delete.description", { count: song?.reviewCount ?? 0 })}
      confirmLabel={loading ? t("common:actions.deleting") : t("common:actions.delete")}
      destructive
      busy={loading}
      onConfirm={async () => {
        if (!song) return;
        try {
          await remove({ variables: { id: song.id } });
          trackEvent({ name: "delete_song" });
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
