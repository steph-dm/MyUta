import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, Download, Info, Trash2, Upload } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Alert, AlertDescription } from "../ui/alert";

interface ProfileDangerZoneProps {
    exporting: boolean;
    importing: boolean;
    deletingAccount: boolean;
    onExportJSON: () => void;
    onExportCSV: () => void;
    onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onDeleteAccount: (password: string) => Promise<string | null>;
}

const ProfileDangerZone = ({
    exporting,
    importing,
    deletingAccount,
    onExportJSON,
    onExportCSV,
    onImport,
    onDeleteAccount,
}: ProfileDangerZoneProps) => {
    const { t } = useTranslation("profile");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deletePassword, setDeletePassword] = useState("");
    const [deleteError, setDeleteError] = useState("");

    const handleDelete = async () => {
        const error = await onDeleteAccount(deletePassword);
        if (error) {
            setDeleteError(error);
        }
    };

    return (
        <Card className="border-red-200 dark:border-red-800">
            <CardHeader>
                <CardTitle className="text-lg text-red-600 dark:text-red-400 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" /> {t("dangerZone.title")}
                </CardTitle>
                <CardDescription>
                    {t("dangerZone.deleteDesc")}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border rounded-lg border-border">
                    <div>
                        <p className="font-medium text-sm">{t("data.export")}</p>
                        <p className="text-xs text-muted-foreground">
                            {t("data.exportDesc")}
                        </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onExportJSON}
                            disabled={exporting}
                            className="gap-2"
                        >
                            <Download className="h-4 w-4" />
                            {exporting ? "..." : "JSON"}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={exporting}
                            className="gap-2"
                            onClick={onExportCSV}
                        >
                            <Download className="h-4 w-4" />
                            CSV
                        </Button>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border rounded-lg border-border">
                    <div>
                        <p className="font-medium text-sm flex items-center gap-1.5">
                            {t("data.import")}
                            <span className="relative group">
                                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 rounded bg-popover border border-border px-3 py-2 text-xs text-popover-foreground shadow-md opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                                    {t("data.importTooltip")}
                                </span>
                            </span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {t("data.importDesc")}
                        </p>
                    </div>
                    <div className="shrink-0">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json"
                            onChange={onImport}
                            className="hidden"
                        />
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={importing}
                            className="gap-2"
                        >
                            <Upload className="h-4 w-4" />
                            {importing ? t("data.importing") : t("data.import")}
                        </Button>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border rounded-lg border-red-200 dark:border-red-800">
                    <div>
                        <p className="font-medium text-sm text-red-600 dark:text-red-400">
                            {t("dangerZone.deleteAccount")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {t("dangerZone.deleteDesc")}
                        </p>
                    </div>
                    {!showDeleteConfirm ? (
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950 gap-2 shrink-0"
                            onClick={() => setShowDeleteConfirm(true)}
                        >
                            <Trash2 className="h-4 w-4" />
                            {t("dangerZone.deleteAccount")}
                        </Button>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Input
                                type="password"
                                placeholder={t("enterPassword")}
                                value={deletePassword}
                                onChange={(e) => setDeletePassword(e.target.value)}
                                className="w-40"
                            />
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={handleDelete}
                                disabled={deletingAccount}
                            >
                                {deletingAccount ? t("dangerZone.deleting") : t("actions.confirm", { ns: "common" })}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setShowDeleteConfirm(false);
                                    setDeletePassword("");
                                    setDeleteError("");
                                }}
                            >
                                {t("actions.cancel", { ns: "common" })}
                            </Button>
                        </div>
                    )}
                </div>
                {deleteError && (
                    <Alert className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-800 dark:text-red-200">
                            {deleteError}
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
};

export default ProfileDangerZone;
