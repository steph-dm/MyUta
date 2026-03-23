import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { ThemeToggle } from "../components/ui/theme-toggle";
import { BarChart3, Mic2, Languages, Activity, Menu, X } from "lucide-react";

const features = [
  { key: "tracking", icon: Mic2 },
  { key: "analytics", icon: BarChart3 },
  { key: "machines", icon: Activity },
  { key: "bilingual", icon: Languages },
] as const;

export default function Landing() {
  const { t, i18n } = useTranslation("auth");
  const { user, loading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  const lang = i18n.language === "ja" ? "en" : "ja";
  const langLabel = i18n.language === "ja" ? "🇺🇸 EN" : "🇯🇵 JA";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-14">
          <Link to="/" className="flex items-center gap-2">
            <img src="/favicon.svg" alt="マイウタ" className="w-6 h-6" />
            <span className="text-lg font-bold">マイウタ</span>
          </Link>

          <div className="hidden sm:flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs px-2 h-7 text-muted-foreground"
              onClick={() => i18n.changeLanguage(lang)}
            >
              {langLabel}
            </Button>
            <ThemeToggle />
            <Link to="/login">
              <Button variant="ghost" size="sm">{t("landing.nav.signIn")}</Button>
            </Link>
            <Link to="/register">
              <Button size="sm">{t("landing.nav.getStarted")}</Button>
            </Link>
          </div>

          <button
            className="sm:hidden p-2 text-muted-foreground"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? t("landing.nav.closeMenu") : t("landing.nav.openMenu")}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="sm:hidden border-t border-border bg-background px-6 py-4 space-y-3">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs px-2 h-7 text-muted-foreground"
                onClick={() => i18n.changeLanguage(lang)}
              >
                {langLabel}
              </Button>
              <ThemeToggle />
            </div>
            <Link to="/login" className="block" onClick={() => setMenuOpen(false)}>
              <Button variant="ghost" size="sm" className="w-full justify-start">
                {t("landing.nav.signIn")}
              </Button>
            </Link>
            <Link to="/register" className="block" onClick={() => setMenuOpen(false)}>
              <Button size="sm" className="w-full">
                {t("landing.nav.getStarted")}
              </Button>
            </Link>
          </div>
        )}
      </nav>

      <section className="pt-28 pb-12 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] mb-5">
            {t("landing.hero.title")}
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto mb-8 leading-relaxed">
            {t("landing.hero.subtitle")}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
            <Link to="/register">
              <Button size="lg" className="text-base px-8 h-11">
                {t("landing.hero.cta")}
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="ghost" size="lg" className="text-base text-muted-foreground">
                {t("landing.hero.signIn")} →
              </Button>
            </Link>
          </div>
          <div className="flex items-center justify-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs font-medium border border-orange-500/20">
              {t("landing.badges.dam")}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium border border-emerald-500/20">
              {t("landing.badges.joysound")}
            </span>
          </div>
        </div>
      </section>

      <section className="px-6 pb-16">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-xl border border-border/60 shadow-xl overflow-hidden bg-card">
            <img
              src="/preview-dashboard.png"
              alt={t("landing.preview.alt")}
              className="w-full block"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      <section className="py-16 px-6 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">
            {t("landing.features.sectionTitle")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {features.map(({ key, icon: Icon }) => (
              <div
                key={key}
                className="group p-5 rounded-xl bg-card border border-border hover:shadow-md hover:border-primary/30 transition-all duration-200"
              >
                <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 text-primary mb-3 group-hover:scale-110 transition-transform">
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <h3 className="text-base font-semibold mb-1.5">
                  {t(`landing.features.${key}.title`)}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t(`landing.features.${key}.description`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">
            {t("landing.cta.title")}
          </h2>
          <p className="text-muted-foreground mb-6 text-sm">
            {t("landing.cta.subtitle")}
          </p>
          <Link to="/register">
            <Button size="lg" className="text-base px-8 h-11">
              {t("landing.cta.button")}
            </Button>
          </Link>
        </div>
      </section>

      <footer className="py-5 px-6 border-t border-border">
        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} マイウタ
        </p>
      </footer>
    </div>
  );
}
