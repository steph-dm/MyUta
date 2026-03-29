import { useState } from "react";
import { useQuery } from "@apollo/client";
import { useTranslation } from "react-i18next";
import { GET_MY_REVIEWS, DASHBOARD_STATS } from "../graphql/queries";
import type { DashboardStats, Issue, Review } from "../types";
import { getIssueColor, getMachineBadgeColor } from "../lib/utils";
import ReviewsTable from "../components/reviews/ReviewsTable";

import {
  StatCardsSkeleton,
  CardSkeleton,
  TableSkeleton,
} from "../components/shared/Skeletons";
import { SectionErrorBoundary } from "../components/shared/ErrorBoundary";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import MaterialIcon from "../components/ui/MaterialIcon";
import { useAuth } from "../contexts/AuthContext";
import { Link } from "react-router-dom";

const Dashboard = () => {
  const { user: currentUser } = useAuth();
  const { t } = useTranslation("dashboard");
  const { t: tReviews } = useTranslation("reviews");
  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >({});

  const {
    loading: statsLoading,
    error: statsError,
    data: statsData,
  } = useQuery(DASHBOARD_STATS, {
    skip: !currentUser?.id,
    fetchPolicy: "cache-and-network",
  });

  const {
    loading: reviewsLoading,
    error: reviewsError,
    data: reviewsData,
  } = useQuery(GET_MY_REVIEWS, {
    variables: { userId: currentUser?.id },
    skip: !currentUser?.id,
    fetchPolicy: "cache-and-network",
  });

  if (!currentUser) {
    return null;
  }

  const loading = statsLoading || reviewsLoading;
  const error = statsError || reviewsError;

  if (loading)
    return (
      <div className="space-y-6">
        <StatCardsSkeleton />
        <CardSkeleton />
        <TableSkeleton />
      </div>
    );
  if (error)
    return (
      <div className="text-red-600 py-8">
        {t("errors.loadFailed", { ns: "common" })}
      </div>
    );

  const stats: DashboardStats = statsData.dashboardStats;
  const { myReviews } = reviewsData;

  if (stats.totalReviews === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <MaterialIcon
              icon="mic"
              size={64}
              className="text-muted-foreground/30 mb-4"
            />
            <h2 className="text-xl font-semibold mb-2">
              {t("welcome", { name: currentUser.name ?? "" })}
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              {t("startReviewing")}
            </p>
            <Button asChild>
              <Link to="/reviews" className="gap-2">
                <Plus className="h-4 w-4" />
                {t("addReview", { ns: "reviews" })}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const damReviews = myReviews.filter((r: Review) => r.machineType === "DAM");
  const joysoundReviews = myReviews.filter(
    (r: Review) => r.machineType === "JOYSOUND",
  );

  const sessionsDiff = stats.sessionsThisMonth - stats.sessionsPrevMonth;

  const sections = [
    {
      type: "DAM" as const,
      reviews: damReviews,
      color: getMachineBadgeColor("DAM"),
      borderColor: "border-blue-200 dark:border-blue-800",
    },
    {
      type: "JOYSOUND" as const,
      reviews: joysoundReviews,
      color: getMachineBadgeColor("JOYSOUND"),
      borderColor: "border-rose-200 dark:border-rose-800",
    },
  ].sort((a, b) => b.reviews.length - a.reviews.length);

  const toggleSection = (type: string) => {
    setCollapsedSections((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const maxIssueCount =
    stats.commonIssues.length > 0 ? stats.commonIssues[0].count : 0;

  return (
    <div className="space-y-6">
      <SectionErrorBoundary>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t("stats.totalReviews")}</CardDescription>
              <CardTitle className="text-xl sm:text-2xl">
                {stats.totalReviews}
              </CardTitle>
            </CardHeader>
          </Card>

          {sections.map(({ type }) => {
            const avg =
              type === "DAM" ? stats.damAvgScore : stats.joysoundAvgScore;
            if (avg == null) return null;
            return (
              <Card key={type}>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-1 flex-wrap">
                    <span>{t("stats.averageScore")}</span>
                    <Badge
                      variant="secondary"
                      className={`${getMachineBadgeColor(type)} text-xs px-2 py-0`}
                    >
                      {type}
                    </Badge>
                  </CardDescription>
                  <CardTitle className="text-xl sm:text-2xl">
                    {avg.toFixed(3)}
                  </CardTitle>
                </CardHeader>
              </Card>
            );
          })}

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <MaterialIcon
                  icon="calendar_month"
                  size={14}
                  className="inline-block"
                />{" "}
                {t("sessions30Days")}
              </CardDescription>
              <CardTitle className="text-xl sm:text-2xl">
                {stats.sessionsThisMonth}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {stats.sessionsPrevMonth > 0 ? (
                <p
                  className={`text-xs ${sessionsDiff > 0 ? "text-green-600" : sessionsDiff < 0 ? "text-red-600" : "text-muted-foreground"}`}
                >
                  {sessionsDiff > 0 ? "↑" : sessionsDiff < 0 ? "↓" : "→"}{" "}
                  {Math.abs(sessionsDiff)} {t("vsPrevious30Days")}
                </p>
              ) : stats.sessionsThisMonth > 0 ? (
                <p className="text-xs text-muted-foreground">
                  {t("noPriorData")}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {t("noSessionsYet")}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </SectionErrorBoundary>

      <SectionErrorBoundary>
        {stats.mostPracticed && stats.mostPracticed.count > 1 && (
          <Card>
            <CardContent className="flex items-center gap-3 py-3">
              <MaterialIcon
                icon="mic"
                size={16}
                className="text-primary shrink-0"
              />
              <span className="text-sm text-muted-foreground">
                {t("mostPracticed")}:{" "}
                <Link
                  to={`/songs/${stats.mostPracticed.songId}`}
                  className="font-medium text-foreground hover:underline transition-colors"
                >
                  {stats.mostPracticed.title}
                </Link>{" "}
                {t("by")}{" "}
                <span className="font-medium text-foreground">
                  {stats.mostPracticed.artistName}
                </span>{" "}
                ({stats.mostPracticed.count} {t("reviews")})
              </span>
            </CardContent>
          </Card>
        )}
      </SectionErrorBoundary>

      <Card>
        <CardHeader>
          <CardTitle>{t("recentReviews")}</CardTitle>
          <CardDescription>{t("scoreDistribution")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sections.map(({ type, reviews, color, borderColor }) => (
            <div key={type} className={`border rounded-lg ${borderColor}`}>
              <button
                onClick={() => toggleSection(type)}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                aria-expanded={
                  !(collapsedSections[type] ?? reviews.length === 0)
                }
              >
                <div className="flex items-center gap-3">
                  {(collapsedSections[type] ?? reviews.length === 0) ? (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                  <Badge
                    variant="secondary"
                    className={`${color} text-sm px-3 py-1`}
                  >
                    {type}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {reviews.length === 0
                      ? t("noRecentReviews")
                      : t("reviewCount", {
                          count: reviews.length,
                          ns: "reviews",
                        })}
                  </span>
                </div>
              </button>
              {!(collapsedSections[type] ?? reviews.length === 0) && (
                <div className="px-4 pb-4">
                  <ReviewsTable reviews={reviews} showActions={false} />
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {stats.commonIssues.length > 0 && (
        <SectionErrorBoundary>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                {t("commonIssues")}
              </CardTitle>
              <CardDescription>{t("areasNeedWork")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {stats.commonIssues.map((is) => (
                <div key={is.issue} className="flex items-center gap-3">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded border ${getIssueColor(is.issue as Issue)} w-[110px] whitespace-nowrap text-center shrink-0`}
                  >
                    {tReviews(`issues.${is.issue}`, { defaultValue: is.issue })}
                  </span>
                  <div className="flex-1 bg-muted rounded-full h-2">
                    <div
                      className="bg-primary rounded-full h-2 transition-all"
                      style={{ width: `${(is.count / maxIssueCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-6 text-right">
                    {is.count}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </SectionErrorBoundary>
      )}
    </div>
  );
};

export default Dashboard;
