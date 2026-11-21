import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import LanguageSelector from "@/components/shared/LanguageSelector";

export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="absolute top-4 right-4 flex items-center gap-3">
        <LanguageSelector />
        <ThemeToggle />
      </div>
      <Link to="/" className="mb-6 flex items-center gap-2">
        <img src="/favicon.svg" alt="" className="w-8 h-8" />
        <span className="text-xl font-bold">{t("appName")}</span>
      </Link>
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle as="h1" className="text-2xl font-bold">
            {title}
          </CardTitle>
          {subtitle && <CardDescription>{subtitle}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-4">
          {children}
          {footer && <div className="text-center text-sm text-muted-foreground">{footer}</div>}
        </CardContent>
      </Card>
    </div>
  );
}
