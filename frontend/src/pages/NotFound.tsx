import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Mic2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Public page: signed-out visitors see it too (no redirect). */
export default function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
      <Mic2 className="h-16 w-16 mb-4 text-muted-foreground" aria-hidden="true" />
      <h1 className="text-4xl font-bold mb-2">404</h1>
      <p className="font-medium">{t("errors.notFoundTitle")}</p>
      <p className="text-muted-foreground mb-6">{t("errors.notFoundDesc")}</p>
      <Button asChild>
        <Link to="/">{t("errors.backHome")}</Link>
      </Button>
    </div>
  );
}
