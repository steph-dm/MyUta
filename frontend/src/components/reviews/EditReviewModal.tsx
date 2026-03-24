import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useMutation } from "@apollo/client";
import { UPSERT_REVIEW } from "../../graphql/queries";
import { useTranslation } from "react-i18next";
import type { Review, Issue, MachineType } from "../../types";
import { ISSUE_OPTIONS, MACHINE_TYPES } from "../../types";
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
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn, getIssueColor, getMachineButtonColor } from "../../lib/utils";
import { trackEvent } from "../../lib/analytics";

interface EditReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReviewUpdated: () => void;
  review: Review | null;
}

const EditReviewModal = ({
  isOpen,
  onClose,
  onReviewUpdated,
  review,
}: EditReviewModalProps) => {
  const [score, setScore] = useState("");
  const [machineType, setMachineType] = useState<MachineType>("DAM");
  const [issues, setIssues] = useState<Issue[]>([]);
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState("");
  const [issuesOpen, setIssuesOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useTranslation("reviews");

  const [upsertReview] = useMutation(UPSERT_REVIEW);

  useEffect(() => {
    if (review) {
      setScore(review.score.toString());
      setMachineType(review.machineType);
      setIssues([...review.issues]);
      setNotes(review.notes || "");
      setDate(String(review.date).split("T")[0]);
    }
  }, [review]);

  useEffect(() => {
    if (!isOpen) {
      setErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!score) {
      newErrors.score = t("validation.enterScore");
    } else {
      const scoreNum = parseFloat(score);
      if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
        newErrors.score = t("validation.scoreRange");
      }
    }

    if (!date) newErrors.date = t("validation.selectDate");

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !review) return;

    setIsSubmitting(true);
    try {
      await upsertReview({
        variables: {
          id: review.id,
          songId: review.song.id,
            date,
          score: parseFloat(score),
          machineType,
          issues: issues,
          notes: notes.trim() || null,
        },
      });
      onReviewUpdated();
      onClose();
      toast(t("toast.updated"));
      trackEvent({ name: "edit_review", data: { songTitle: review.song.title } });
    } catch {
      toast.error(t("toast.saveFailed"));
      setErrors({ submit: t("toast.saveFailed") });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!review) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("modal.editTitle")}</DialogTitle>
          <DialogDescription>
            {t("modal.editDescription", { song: review.song.title, artist: review.song.artist.name })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="date">{t("modal.performanceDate")}</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setErrors((prev) => ({ ...prev, date: "" }));
                }}
                className={cn(errors.date && "border-red-500")}
              />
              {errors.date && (
                <p className="text-sm text-red-500">{errors.date}</p>
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
                value={score}
                onChange={(e) => {
                  const value = e.target.value;
                  if (
                    value === "" ||
                    (!isNaN(parseFloat(value)) &&
                      parseFloat(value) >= 0 &&
                      parseFloat(value) <= 100)
                  ) {
                    setScore(value);
                  }
                }}
                className={cn(errors.score && "border-red-500")}
              />
              {errors.score && (
                <p className="text-sm text-red-500">{errors.score}</p>
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
                    variant={machineType === type ? "default" : "outline"}
                    className={cn(
                      "flex-1",
                      machineType === type && getMachineButtonColor(type),
                    )}
                    onClick={() => setMachineType(type)}
                  >
                    {type}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="issues">{t("modal.issues")}</Label>
              <Popover open={issuesOpen} onOpenChange={setIssuesOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={issuesOpen}
                    className="w-full justify-between"
                  >
                    {issues.length === 0
                      ? t("modal.noIssueSelected")
                      : t("modal.issuesSelected", { count: issues.length })}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder={t("modal.searchIssues")} />
                    <CommandEmpty>{t("modal.noIssuesFound")}</CommandEmpty>
                    <CommandGroup>
                      {[...ISSUE_OPTIONS].sort((a, b) =>
                        t(`issues.${a}`).localeCompare(t(`issues.${b}`))
                      ).map((issue) => (
                        <CommandItem
                          key={issue}
                          onSelect={() =>
                            setIssues((prev) =>
                              prev.includes(issue)
                                ? prev.filter((i) => i !== issue)
                                : [...prev, issue],
                            )
                          }
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              issues.includes(issue)
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                          {t(`issues.${issue}`)}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {issues.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {issues.map((issue) => (
                <Badge key={issue} variant="outline" className={cn("text-xs", getIssueColor(issue))}>
                  {t(`issues.${issue}`)}
                  <button
                    type="button"
                    onClick={() =>
                      setIssues((prev) => prev.filter((i) => i !== issue))
                    }
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
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {errors.submit && (
            <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950 p-3 rounded-md">
              {errors.submit}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t("modal.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t("modal.submitting") : t("modal.submitEdit")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditReviewModal;
