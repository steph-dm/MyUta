import { useId } from "react";
import { useTranslation } from "react-i18next";
import { ArrowDown, ArrowUp, ArrowUpDown, CalendarDays, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { GenrePicker } from "@/components/shared";
import type { DatePreset, ReviewTableState } from "@/hooks/useReviewTableState";

const PRESETS: Exclude<DatePreset, null | "custom">[] = ["day", "week", "month", "year"];

export default function ReviewsToolbar({
  state,
  total,
}: {
  state: ReviewTableState;
  total: number | null;
}) {
  const { t } = useTranslation("reviews");
  const id = useId();
  const dateLabel = state.datePreset ? t(`dates.${state.datePreset}`) : t("toolbar.date");
  const nextSort = state.scoreSort === null ? "desc" : state.scoreSort === "desc" ? "asc" : null;
  const sortLabel =
    state.scoreSort === "desc"
      ? t("toolbar.sortScoreDesc")
      : state.scoreSort === "asc"
        ? t("toolbar.sortScoreAsc")
        : t("toolbar.sortNone");

  return (
    <div className="space-y-2">
      <div className="flex flex-col lg:flex-row gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            aria-label={t("toolbar.search")}
            placeholder={t("toolbar.search")}
            value={state.search}
            onChange={(e) => state.setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-48">
            <GenrePicker values={state.genres} onChange={state.setGenres} />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={state.datePreset ? "default" : "outline"}
                size="sm"
                className="h-9 gap-1"
              >
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                {dateLabel}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-60 p-3 space-y-1" align="start">
              <div role="radiogroup" aria-label={t("toolbar.date")} className="space-y-1">
                {[...PRESETS, "custom" as const, null].map((p) => (
                  <Button
                    key={p ?? "any"}
                    role="radio"
                    aria-checked={state.datePreset === p}
                    variant={state.datePreset === p ? "default" : "ghost"}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => state.setDatePreset(p)}
                  >
                    {p ? t(`dates.${p}`) : t("dates.clear")}
                  </Button>
                ))}
              </div>
              {state.datePreset === "custom" && (
                <div className="space-y-2 pt-2">
                  <div className="space-y-1">
                    <Label htmlFor={`${id}-from`} className="text-xs">
                      {t("dates.from")}
                    </Label>
                    <Input
                      id={`${id}-from`}
                      type="date"
                      value={state.customFrom}
                      onChange={(e) => state.setCustomFrom(e.target.value)}
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`${id}-to`} className="text-xs">
                      {t("dates.to")}
                    </Label>
                    <Input
                      id={`${id}-to`}
                      type="date"
                      value={state.customTo}
                      onChange={(e) => state.setCustomTo(e.target.value)}
                      className="h-8"
                    />
                  </div>
                </div>
              )}
            </PopoverContent>
          </Popover>
          <Button
            variant={state.scoreSort ? "default" : "outline"}
            size="sm"
            className="h-9 gap-1"
            onClick={() => state.setScoreSort(nextSort)}
            aria-label={`${t("toolbar.score")}: ${sortLabel}`}
            title={sortLabel}
          >
            {state.scoreSort === "asc" ? (
              <ArrowUp className="h-4 w-4" aria-hidden="true" />
            ) : state.scoreSort === "desc" ? (
              <ArrowDown className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ArrowUpDown className="h-4 w-4" aria-hidden="true" />
            )}
            {t("toolbar.score")}
          </Button>
          {(state.hasFilters || state.scoreSort) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-muted-foreground"
              onClick={state.clearAll}
            >
              {t("toolbar.clear")}
            </Button>
          )}
        </div>
      </div>
      {state.hasFilters && total !== null && (
        <p className="text-sm text-muted-foreground" role="status">
          {t("toolbar.matching", { count: total, total })}
        </p>
      )}
    </div>
  );
}
