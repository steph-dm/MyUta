import { useRef, useState, type ChangeEvent } from "react";
import { useApolloClient } from "@apollo/client";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Database, Download, Upload } from "lucide-react";
import { IMPORT_DATA } from "@/graphql/account";
import type { ImportDataMutation } from "@/gql/graphql";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { REVIEW_LISTS } from "@/components/reviews/LogReviewDialog";
import { CLIENT_HEADER } from "@/lib/apollo";
import { trackEvent } from "@/lib/analytics";
import { downloadBlob, filenameFromDisposition } from "@/lib/download";
import { errorMessage, UploadError } from "@/lib/errors";
import { uploadMutation } from "@/lib/upload";

type Result = ImportDataMutation["importData"];

/** Export (file download from /export) and import (multipart upload) with a detailed result. */
export default function DataCard() {
  const { t } = useTranslation("profile");
  const client = useApolloClient();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"json" | "csv" | "import" | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const exportAs = async (format: "json" | "csv") => {
    setBusy(format);
    try {
      const res = await fetch(`/export?format=${format}`, {
        credentials: "include",
        headers: CLIENT_HEADER,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ errors: [] }));
        throw new UploadError(body.errors ?? []);
      }
      downloadBlob(
        await res.blob(),
        filenameFromDisposition(res.headers.get("Content-Disposition"), `myuta-export.${format}`),
      );
      trackEvent({ name: "export_data" });
    } catch (e) {
      toast.error(errorMessage(e, t));
    } finally {
      setBusy(null);
    }
  };

  const importFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy("import");
    try {
      const data = await uploadMutation(IMPORT_DATA, {}, "file", file);
      setResult(data.importData);
      trackEvent({
        name: "import_data",
        data: { reviewsImported: data.importData.reviewsImported },
      });
      await client.refetchQueries({ include: REVIEW_LISTS });
    } catch (err) {
      toast.error(errorMessage(err, t));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Database className="h-5 w-5" aria-hidden="true" /> {t("data.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border p-4">
          <div>
            <p className="font-medium text-sm">{t("data.export")}</p>
            <p className="text-xs text-muted-foreground">{t("data.exportDesc")}</p>
          </div>
          <div className="flex gap-2">
            {(["json", "csv"] as const).map((f) => (
              <Button
                key={f}
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={busy !== null}
                onClick={() => void exportAs(f)}
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                {f.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border p-4">
          <div>
            <p className="font-medium text-sm">{t("data.import")}</p>
            <p className="text-xs text-muted-foreground">{t("data.importDesc")}</p>
          </div>
          <input
            ref={input}
            type="file"
            accept=".json,.csv,application/json,text/csv"
            className="hidden"
            onChange={importFile}
          />
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={busy !== null}
            onClick={() => input.current?.click()}
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            {busy === "import" ? t("data.importing") : t("data.import")}
          </Button>
        </div>
      </CardContent>
      <Dialog open={!!result} onOpenChange={(o) => !o && setResult(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("data.resultTitle")}</DialogTitle>
          </DialogHeader>
          {result && (
            <div className="space-y-3 text-sm">
              <ul className="space-y-1">
                <li>{t("data.resultImported", { count: result.reviewsImported })}</li>
                <li>{t("data.resultDuplicate", { count: result.reviewsDuplicate })}</li>
                <li>{t("data.resultSkipped", { count: result.reviewsSkipped })}</li>
                <li>
                  {t("data.resultFavorites", {
                    favorites: result.favoritesImported,
                    goals: result.goalsImported,
                  })}
                </li>
              </ul>
              {result.errors.length > 0 && (
                <ul className="divide-y rounded-md border">
                  {result.errors.map((e, i) => (
                    <li key={i} className="p-2">
                      <span className="font-medium">
                        {t("data.errorRow", { section: e.section, row: e.row })}
                      </span>
                      {e.field ? ` (${e.field})` : ""}:{" "}
                      {t(`common:errors.reasons.${e.code}`, { defaultValue: e.message })}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
