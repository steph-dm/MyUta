import { useTranslation } from "react-i18next";
import { BarChart3, Minus, Star, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/**
 * Average, best and trend. The trend compares the last 3 takes with the 3
 * before them, so it needs 6 takes; with fewer it is not shown as up or down.
 */
export function computeStats(scoresNewestFirst: number[]) {
  const recent = scoresNewestFirst.slice(0, 3);
  const before = scoresNewestFirst.slice(3, 6);
  const trend = before.length === 3 ? avg(recent) - avg(before) : null;
  return {
    average: avg(scoresNewestFirst),
    best: Math.max(...scoresNewestFirst),
    recent: avg(recent),
    trend,
  };
}

export default function MachineStatsGrid({ scores, accent }: { scores: number[]; accent: string }) {
  const { t } = useTranslation("songs");
  if (scores.length === 0) return null;
  const s = computeStats(scores);
  const TrendIcon = s.trend === null ? Minus : s.trend >= 0 ? TrendingUp : TrendingDown;
  const cells = [
    {
      icon: <BarChart3 className={`h-5 w-5 ${accent}`} aria-hidden="true" />,
      label: t("detail.average"),
      value: s.average.toFixed(3),
    },
    {
      icon: <Star className="h-5 w-5 text-yellow-500" aria-hidden="true" />,
      label: t("detail.best"),
      value: s.best.toFixed(3),
    },
    {
      icon: (
        <TrendIcon
          className={`h-5 w-5 ${s.trend === null ? "text-muted-foreground" : s.trend >= 0 ? "text-green-600" : "text-red-600"}`}
          aria-hidden="true"
        />
      ),
      label: t("detail.trend"),
      value: s.recent.toFixed(3),
      hint: s.trend === null ? t("detail.trendNeedsData") : t("detail.trendHint"),
    },
  ];
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-4">
      {cells.map((c) => (
        <Card key={c.label}>
          <CardContent
            className="p-3 sm:p-4 flex flex-col sm:flex-row items-center sm:items-start gap-1 sm:gap-2 text-center sm:text-left"
            title={c.hint}
          >
            {c.icon}
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">{c.label}</p>
              <p className="text-base sm:text-2xl font-bold tabular-nums">{c.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
