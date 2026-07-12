import { useTranslation } from "react-i18next";
import type { Review } from "../../types";
import { Card, CardContent } from "../ui/card";
import {
  Star,
  TrendingUp,
  TrendingDown,
  BarChart3,
} from "lucide-react";

interface MachineStatsGridProps {
  reviews: Review[];
  iconColor: string;
}

function computeStats(reviews: Review[]) {
  const scores = reviews.map((r) => r.score);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const best = Math.max(...scores);
  const recent = scores.slice(0, Math.min(3, scores.length));
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  return { avg, best, recentAvg, trendUp: recentAvg >= avg };
}

const MachineStatsGrid = ({ reviews, iconColor }: MachineStatsGridProps) => {
  const { t } = useTranslation("songs");
  const stats = computeStats(reviews);

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-4">
      <Card>
        <CardContent className="p-3 sm:pt-6 sm:px-6">
          <div className="flex flex-col items-center text-center sm:flex-row sm:text-left sm:items-center gap-1 sm:gap-2">
            <BarChart3
              className={`h-4 w-4 sm:h-5 sm:w-5 ${iconColor}`}
            />
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {t("detail.average")}
              </p>
              <p className="text-base sm:text-2xl font-bold">
                {stats.avg.toFixed(3)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-3 sm:pt-6 sm:px-6">
          <div className="flex flex-col items-center text-center sm:flex-row sm:text-left sm:items-center gap-1 sm:gap-2">
            <Star className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {t("detail.best")}
              </p>
              <p className="text-base sm:text-2xl font-bold">
                {stats.best.toFixed(3)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-3 sm:pt-6 sm:px-6">
          <div className="flex flex-col items-center text-center sm:flex-row sm:text-left sm:items-center gap-1 sm:gap-2">
            {stats.trendUp ? (
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
            )}
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {t("detail.trend")}
              </p>
              <p className="text-base sm:text-2xl font-bold">
                <span className="hidden sm:inline">
                  {stats.trendUp ? "↑" : "↓"}{" "}
                </span>
                {stats.recentAvg.toFixed(3)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MachineStatsGrid;
