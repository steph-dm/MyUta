import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FieldError, IssuePicker, MachinePicker } from "@/components/shared";
import { todayISO } from "@/lib/dates";
import { DETAIL_PERCENT_FIELDS, type ReviewErrors, type ReviewFormValues } from "./form";

interface Props {
  value: ReviewFormValues;
  onChange: (v: ReviewFormValues) => void;
  errors: ReviewErrors;
}

/** Fields of one take, shared by the log and edit dialogs. */
export default function ReviewFields({ value, onChange, errors }: Props) {
  const { t } = useTranslation("reviews");
  const id = useId();
  const [detailsOpen, setDetailsOpen] = useState(Object.keys(value.details).length > 0);
  const set = <K extends keyof ReviewFormValues>(k: K, v: ReviewFormValues[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor={`${id}-date`}>{t("fields.date")}</Label>
          <Input
            id={`${id}-date`}
            type="date"
            max={todayISO()}
            value={value.date}
            onChange={(e) => set("date", e.target.value)}
            aria-invalid={!!errors.date}
            aria-describedby={errors.date ? `${id}-date-error` : undefined}
          />
          <FieldError id={`${id}-date-error`} message={errors.date} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${id}-score`}>{t("fields.score")}</Label>
          <Input
            id={`${id}-score`}
            type="number"
            inputMode="decimal"
            min={0}
            max={100}
            step={0.001}
            placeholder="85.500"
            value={value.score}
            onChange={(e) => set("score", e.target.value)}
            aria-invalid={!!errors.score}
            aria-describedby={errors.score ? `${id}-score-error` : undefined}
          />
          <FieldError id={`${id}-score-error`} message={errors.score} />
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-sm font-medium leading-none" id={`${id}-machine-label`}>
          {t("fields.machine")}
        </span>
        <MachinePicker
          label={t("fields.machine")}
          value={value.machineType}
          onChange={(m) => m && set("machineType", m)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor={`${id}-key`}>{t("fields.keyChange")}</Label>
          <select
            id={`${id}-key`}
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            value={value.keyChange}
            onChange={(e) => set("keyChange", Number(e.target.value))}
            aria-describedby={`${id}-key-hint`}
          >
            {Array.from({ length: 25 }, (_, i) => i - 12).map((k) => (
              <option key={k} value={k}>
                {k === 0 ? t("fields.keyOriginal") : k > 0 ? `+${k}` : k}
              </option>
            ))}
          </select>
          <p id={`${id}-key-hint`} className="text-xs text-muted-foreground">
            {t("fields.keyChangeHint")}
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${id}-variant`}>{t("fields.variant")}</Label>
          <Input
            id={`${id}-variant`}
            value={value.variant}
            maxLength={100}
            onChange={(e) => set("variant", e.target.value)}
            aria-describedby={`${id}-variant-hint`}
          />
          <p id={`${id}-variant-hint`} className="text-xs text-muted-foreground">
            {t("fields.variantHint")}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${id}-issues`}>{t("fields.issues")}</Label>
        <IssuePicker id={`${id}-issues`} values={value.issues} onChange={(v) => set("issues", v)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${id}-notes`}>{t("fields.notes")}</Label>
        <Textarea
          id={`${id}-notes`}
          rows={2}
          maxLength={1000}
          placeholder={t("fields.notesPlaceholder")}
          value={value.notes}
          onChange={(e) => set("notes", e.target.value)}
        />
      </div>

      <div className="rounded-md border">
        <button
          type="button"
          className="flex w-full items-center gap-2 p-3 text-sm font-medium"
          aria-expanded={detailsOpen}
          aria-controls={`${id}-details`}
          onClick={() => setDetailsOpen((o) => !o)}
        >
          {detailsOpen ? (
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          )}
          {t("fields.details")}
        </button>
        {detailsOpen && (
          <div id={`${id}-details`} className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-3 pb-3">
            {[...DETAIL_PERCENT_FIELDS, "totalPoints" as const, "grade" as const].map((f) => (
              <div key={f} className="space-y-1">
                <Label htmlFor={`${id}-d-${f}`} className="text-xs">
                  {t(`details.${f}`)}
                </Label>
                <Input
                  id={`${id}-d-${f}`}
                  type={f === "grade" ? "text" : "number"}
                  inputMode={f === "grade" ? "text" : "decimal"}
                  min={0}
                  max={f === "totalPoints" ? undefined : 100}
                  step={f === "totalPoints" ? 1 : 0.01}
                  maxLength={f === "grade" ? 5 : undefined}
                  value={value.details[f] ?? ""}
                  onChange={(e) => set("details", { ...value.details, [f]: e.target.value })}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
