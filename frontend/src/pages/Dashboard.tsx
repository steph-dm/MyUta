import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@apollo/client";
import { useTranslation } from "react-i18next";
import { CalendarDays, Mic2, Plus } from "lucide-react";
import { DASHBOARD } from "@/graphql/reviews";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState, MachineBadge, MachineSection, PageSkeleton } from "@/components/shared";
import ReviewsTable from "@/components/reviews/ReviewsTable";
import LogReviewDialog from "@/components/reviews/LogReviewDialog";
import { useAuth } from "@/contexts/AuthContext";
import { issueColor } from "@/lib/constants";
import { MACHINES, MACHINE_TYPES } from "@/lib/machines";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { t } = useTranslation("dashboard");
  const { user } = useAuth();
  const [logOpen, setLogOpen] = useState(false);
  const { data, loading, error, refetch } = useQuery(DASHBOARD);

  if (loading && !data) return <PageSkeleton />;
  if (error && !data) return <ErrorState onRetry={() => void refetch()} />;
  const stats = data!.dashboardStats;
  const logDialog = <LogReviewDialog open={logOpen} onOpenChange={setLogOpen} />;

  if (stats.totalReviews === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-16 text-center">
          <Mic2 className="h-16 w-16 text-muted-foreground/30 mb-4" aria-hidden="true" />
          <h1 className="text-xl font-semibold mb-2">{t("welcome", { name: user?.name ?? "" })}</h1>
          <p className="text-muted-foreground mb-6 max-w-md">{t("startReviewing")}</p>
          <Button onClick={() => setLogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t("reviews:add")}
          </Button>
        </CardContent>
        {logDialog}
      </Card>
    );
  }

  const diff = stats.sessionsLast30Days - stats.sessionsPrev30Days;
  const byMachine = new Map(stats.machineStats.map((m) => [m.machineType, m]));
  const machinesByUse = [...MACHINE_TYPES].sort(
    (a, b) => (byMachine.get(b)?.reviewCount ?? 0) - (byMachine.get(a)?.reviewCount ?? 0),
  );
  const maxIssue = stats.commonIssues[0]?.count ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t("common:nav.dashboard")}</h1>
        <Button onClick={() => setLogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t("reviews:add")}
        </Button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("stats.totalReviews")}</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{stats.totalReviews}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            {t("stats.library", { songs: stats.totalSongs, artists: stats.totalArtists })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" /> {t("sessions.title")}
            </CardDescription>
            <CardTitle className="text-2xl tabular-nums">{stats.sessionsLast30Days}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p
              className={cn(
                "text-xs",
                stats.sessionsPrev30Days > 0 &&
                  (diff > 0
                    ? "text-green-600"
                    : diff < 0
                      ? "text-red-600"
                      : "text-muted-foreground"),
                stats.sessionsPrev30Days === 0 && "text-muted-foreground",
              )}
            >
              {stats.sessionsPrev30Days > 0
                ? t("sessions.vsPrevious", {
                    arrow: diff > 0 ? "↑" : diff < 0 ? "↓" : "→",
                    diff: Math.abs(diff),
                  })
                : stats.sessionsLast30Days > 0
                  ? t("sessions.noPriorData")
                  : t("sessions.none")}
            </p>
          </CardContent>
        </Card>
        {stats.machineStats.map((m) => (
          <Card key={m.machineType}>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1 flex-wrap">
                {t("stats.average")}{" "}
                <MachineBadge type={m.machineType} className="text-xs px-2 py-0" />
              </CardDescription>
              <CardTitle className="text-2xl tabular-nums">{m.averageScore.toFixed(3)}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-xs text-muted-foreground">
              {t("stats.best", { score: m.bestScore.toFixed(3) })}
            </CardContent>
          </Card>
        ))}
      </div>

      {stats.mostPracticed && stats.mostPracticed.count > 1 && (
        <Card>
          <CardContent className="flex items-center gap-3 py-3 text-sm">
            <Mic2 className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
            <span className="text-muted-foreground">{t("mostPracticed")}:</span>
            <Link
              to={`/songs/${stats.mostPracticed.songId}`}
              className="font-medium hover:underline"
            >
              {t("mostPracticedValue", {
                title: stats.mostPracticed.title,
                artist: stats.mostPracticed.artistName,
                count: stats.mostPracticed.count,
              })}
            </Link>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle as="h2">{t("recent.title")}</CardTitle>
          <CardDescription>{t("recent.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {machinesByUse.map((m) => {
            const count = byMachine.get(m)?.reviewCount ?? 0;
            return (
              <MachineSection
                key={m}
                type={m}
                count={count}
                countLabel={count ? t("reviews:count", { count }) : t("reviews:none")}
              >
                <ReviewsTable
                  filter={{ machineType: m }}
                  readOnly
                  caption={t("reviews:table.caption", { machine: MACHINES[m].label })}
                />
              </MachineSection>
            );
          })}
        </CardContent>
      </Card>

      {stats.commonIssues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle as="h2" className="text-base">
              {t("issues.title")}
            </CardTitle>
            <CardDescription>{t("issues.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {stats.commonIssues.map((is) => (
                <li key={is.issue} className="flex items-center gap-3">
                  <span
                    className={cn(
                      "text-xs font-medium px-2 py-0.5 rounded border w-28 text-center shrink-0",
                      issueColor(is.issue),
                    )}
                  >
                    {t(`common:issues.${is.issue}`)}
                  </span>
                  <div className="flex-1 bg-muted rounded-full h-2" aria-hidden="true">
                    <div
                      className="bg-primary rounded-full h-2"
                      style={{ width: `${(is.count / maxIssue) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-6 text-right tabular-nums">
                    {is.count}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
      {logDialog}
    </div>
  );
}
