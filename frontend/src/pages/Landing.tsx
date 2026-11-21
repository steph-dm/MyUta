import { Link, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Activity, BarChart3, Languages, Mic2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import LanguageSelector from "@/components/shared/LanguageSelector";
import { MachineBadge } from "@/components/shared";
import { useAuth } from "@/contexts/AuthContext";
import { analyticsEnabled } from "@/lib/analytics";
import { MACHINE_TYPES } from "@/lib/machines";

const FEATURES = [
  { key: "tracking", icon: Mic2 },
  { key: "analytics", icon: BarChart3 },
  { key: "machines", icon: Activity },
  { key: "bilingual", icon: Languages },
] as const;

/** Rendered immediately (no blank page while the session is checked). */
export default function Landing() {
  const { t } = useTranslation("auth");
  const { user } = useAuth();
  if (user) return <Navigate to="/dashboard" replace />;
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3 px-6 py-3">
          <Link to="/" className="flex items-center gap-2">
            <img src="/favicon.svg" alt="" className="w-6 h-6" />
            <span className="text-lg font-bold">{t("common:appName")}</span>
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSelector />
            <ThemeToggle />
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login">{t("landing.nav.signIn")}</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/register">{t("landing.nav.getStarted")}</Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <section className="max-w-4xl mx-auto px-6 py-20 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            {t("landing.hero.title")}
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">{t("landing.hero.subtitle")}</p>
          <div className="mt-6 flex justify-center gap-2">
            {MACHINE_TYPES.map((m) => (
              <MachineBadge key={m} type={m} />
            ))}
          </div>
          <Button size="lg" className="mt-8" asChild>
            <Link to="/register">{t("landing.hero.cta")}</Link>
          </Button>
        </section>
        <section className="max-w-6xl mx-auto px-6 pb-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ key, icon: Icon }) => (
            <div key={key} className="rounded-lg border p-6">
              <Icon className="h-6 w-6 text-primary mb-3" aria-hidden="true" />
              <h2 className="font-semibold">{t(`landing.features.${key}.title`)}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {t(`landing.features.${key}.description`)}
              </p>
            </div>
          ))}
        </section>
      </main>
      <footer className="border-t py-6 px-6 text-center text-xs text-muted-foreground space-y-1">
        <p>{t("landing.footer")}</p>
        {analyticsEnabled() && <p>{t("common:privacy.analytics")}</p>}
      </footer>
    </div>
  );
}
