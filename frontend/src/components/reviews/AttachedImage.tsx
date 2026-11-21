import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, ScanText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { intlLocale } from "@/i18n";

export type AttachmentStatus = "converting" | "attached" | "reading" | "read" | "failed";

function formatSize(bytes: number, locale: string): string {
  const mb = bytes / (1024 * 1024);
  const fmt = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  return mb >= 1
    ? `${fmt.format(mb)} MB`
    : `${fmt.format(Math.max(1, Math.round(bytes / 1024)))} KB`;
}

interface Props {
  file: File;
  status: AttachmentStatus;
  /** Shown when the photo cannot be used (too large, reading disabled…). */
  message?: string;
  canRead: boolean;
  onRead: () => void;
  onRemove: () => void;
}

/** The attached result photo: preview, name and size, with "Read result" and "Remove". */
export default function AttachedImage({ file, status, message, canRead, onRead, onRemove }: Props) {
  const { t } = useTranslation("reviews");
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  const reading = status === "reading" || status === "converting";

  return (
    <div
      role="group"
      aria-label={t("photo.label")}
      className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3"
    >
      {status === "converting" ? (
        <div
          className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md border bg-muted"
          aria-hidden="true"
        >
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <img
          src={url}
          alt={t("photo.preview", { name: file.name })}
          className="h-20 w-20 shrink-0 rounded-md object-cover border"
        />
      )}
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-xs text-muted-foreground">{t("photo.label")}</p>
        <p className="text-sm font-medium truncate" title={file.name}>
          {file.name}
        </p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {formatSize(file.size, intlLocale())}
        </p>
        {status === "converting" && (
          <p role="status" className="text-xs text-muted-foreground">
            {t("photo.converting")}
          </p>
        )}
        {message && (
          <p role="status" className="text-xs text-muted-foreground">
            {message}
          </p>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          {canRead && status !== "converting" && (
            <Button
              type="button"
              size="sm"
              variant={status === "read" ? "outline" : "default"}
              disabled={reading}
              onClick={onRead}
              className="gap-1"
            >
              {reading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <ScanText className="h-4 w-4" aria-hidden="true" />
              )}
              {reading
                ? t("log.reading")
                : status === "read" || status === "failed"
                  ? t("photo.reread")
                  : t("photo.read")}
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={reading}
            onClick={onRemove}
            className="gap-1"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            {t("photo.remove")}
          </Button>
        </div>
      </div>
    </div>
  );
}
