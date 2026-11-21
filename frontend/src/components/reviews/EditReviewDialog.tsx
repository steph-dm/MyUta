import { useState, type FormEvent } from "react";
import { useMutation } from "@apollo/client";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { UPDATE_REVIEW } from "@/graphql/reviews";
import type { ReviewCoreFragment } from "@/gql/graphql";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trackEvent } from "@/lib/analytics";
import { errorMessage, fieldErrors } from "@/lib/errors";
import ReviewFields from "./ReviewFields";
import {
  fromReview,
  toReviewInput,
  validateReview,
  type ReviewErrors,
  type ReviewFormValues,
} from "./form";
import { REVIEW_LISTS } from "./LogReviewDialog";

interface Props {
  review: ReviewCoreFragment | null;
  song: { title: string; artistName: string } | null;
  onClose: () => void;
}

/** Remounted per review, so the form always starts from that review. */
export default function EditReviewDialog(props: Props) {
  return props.review ? (
    <EditReviewForm key={props.review.id} {...props} review={props.review} />
  ) : null;
}

function EditReviewForm({ review, song, onClose }: Props & { review: ReviewCoreFragment }) {
  const { t } = useTranslation("reviews");
  const [values, setValues] = useState<ReviewFormValues>(() => fromReview(review));
  const [errors, setErrors] = useState<ReviewErrors>({});
  const [update, { loading }] = useMutation(UPDATE_REVIEW, { refetchQueries: REVIEW_LISTS });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next = validateReview(values, t);
    setErrors(next);
    if (Object.keys(next).length) return;
    try {
      await update({ variables: { id: review.id, input: toReviewInput(values) } });
      trackEvent({ name: "edit_review" });
      toast.success(t("toast.updated"));
      onClose();
    } catch (err) {
      setErrors({ ...fieldErrors(err, t), form: errorMessage(err, t) });
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("edit.title")}</DialogTitle>
          {song && (
            <DialogDescription>
              {t("edit.description", { song: song.title, artist: song.artistName })}
            </DialogDescription>
          )}
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" noValidate>
          {errors.form && (
            <div role="alert" className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {errors.form}
            </div>
          )}
          <ReviewFields value={values} onChange={setValues} errors={errors} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t("common:actions.cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t("common:actions.saving") : t("edit.submit")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
