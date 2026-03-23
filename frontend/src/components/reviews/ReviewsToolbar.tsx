import { useTranslation } from "react-i18next";
import { GENRE_OPTIONS } from "../../types";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "../ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
} from "../ui/command";
import {
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Check,
    Filter,
    Search,
    CalendarDays,
} from "lucide-react";
import { cn } from "../../lib/utils";
import type { UseReviewFiltersReturn } from "../../hooks/useReviewFilters";

interface ReviewsToolbarProps {
    filters: UseReviewFiltersReturn;
    totalReviews: number;
}

const ReviewsToolbar = ({ filters, totalReviews }: ReviewsToolbarProps) => {
    const { t } = useTranslation("reviews");

    return (
        <>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative w-full sm:flex-1 sm:min-w-[200px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={t("table.searchPlaceholder")}
                        value={filters.searchQuery}
                        onChange={(e) => filters.setSearchQuery(e.target.value)}
                        className="pl-8 h-9"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <Popover open={filters.genreFilterOpen} onOpenChange={filters.setGenreFilterOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9" aria-label={t("table.genre")}>
                                <Filter className="h-4 w-4 min-[400px]:mr-1" />
                                <span className="hidden min-[400px]:inline">{t("table.genre")}</span>
                                {filters.selectedGenres.length > 0 && (
                                    <Badge variant="secondary" className="ml-1 h-5 px-1 text-xs">
                                        {filters.selectedGenres.length}
                                    </Badge>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-0" align="start">
                            <Command>
                                <CommandInput placeholder={t("filters.searchGenres", { ns: "songs" })} />
                                <CommandEmpty>{t("filters.noGenresFound", { ns: "songs" })}</CommandEmpty>
                                <CommandGroup>
                                    {[...GENRE_OPTIONS].sort((a, b) =>
                                        t(`songs:genreNames.${a}`).localeCompare(t(`songs:genreNames.${b}`))
                                    ).map((genre) => (
                                        <CommandItem
                                            key={genre}
                                            onSelect={() =>
                                                filters.setSelectedGenres((prev) =>
                                                    prev.includes(genre)
                                                        ? prev.filter((g) => g !== genre)
                                                        : [...prev, genre],
                                                )
                                            }
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    filters.selectedGenres.includes(genre)
                                                        ? "opacity-100"
                                                        : "opacity-0",
                                                )}
                                            />
                                            {t(`songs:genreNames.${genre}`)}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </Command>
                        </PopoverContent>
                    </Popover>

                    <Popover open={filters.dateFilterOpen} onOpenChange={filters.setDateFilterOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant={filters.datePreset ? "default" : "outline"}
                                size="sm"
                                className="h-9"
                                aria-label={filters.dateLabel ?? t("table.date")}
                            >
                                <CalendarDays className="h-4 w-4 min-[400px]:mr-1" />
                                <span className="hidden min-[400px]:inline">{filters.dateLabel ?? t("table.date")}</span>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-3 space-y-2" align="start">
                            {(["day", "week", "month", "year"] as const).map((preset) => {
                                const labels = {
                                    day: t("datePresets.lastDay"),
                                    week: t("datePresets.lastWeek"),
                                    month: t("datePresets.lastMonth"),
                                    year: t("datePresets.lastYear"),
                                };
                                return (
                                    <Button
                                        key={preset}
                                        variant={filters.datePreset === preset ? "default" : "ghost"}
                                        size="sm"
                                        className="w-full justify-start"
                                        onClick={() => {
                                            filters.setDatePreset(filters.datePreset === preset ? null : preset);
                                            filters.setCustomDateFrom("");
                                            filters.setCustomDateTo("");
                                        }}
                                    >
                                        {labels[preset]}
                                    </Button>
                                );
                            })}
                            <div className="border-t pt-2 space-y-2">
                                <Button
                                    variant={filters.datePreset === "custom" ? "default" : "ghost"}
                                    size="sm"
                                    className="w-full justify-start"
                                    onClick={() =>
                                        filters.setDatePreset(filters.datePreset === "custom" ? null : "custom")
                                    }
                                >
                                    {t("datePresets.customRange")}
                                </Button>
                                {filters.datePreset === "custom" && (
                                    <div className="space-y-1.5 pl-1">
                                        <div>
                                            <label className="text-xs text-muted-foreground">
                                                {t("datePresets.from")}
                                            </label>
                                            <Input
                                                type="date"
                                                value={filters.customDateFrom}
                                                onChange={(e) => filters.setCustomDateFrom(e.target.value)}
                                                className="h-8 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-muted-foreground">{t("datePresets.to")}</label>
                                            <Input
                                                type="date"
                                                value={filters.customDateTo}
                                                onChange={(e) => filters.setCustomDateTo(e.target.value)}
                                                className="h-8 text-sm"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                            {filters.datePreset && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start text-muted-foreground"
                                    onClick={() => {
                                        filters.setDatePreset(null);
                                        filters.setCustomDateFrom("");
                                        filters.setCustomDateTo("");
                                        filters.setDateFilterOpen(false);
                                    }}
                                >
                                    {t("table.clearDateFilter")}
                                </Button>
                            )}
                        </PopoverContent>
                    </Popover>

                    <Button
                        variant={filters.scoreSortDirection ? "default" : "outline"}
                        size="sm"
                        className="h-9"
                        onClick={() =>
                            filters.setScoreSortDirection((prev) => (prev === "desc" ? "asc" : "desc"))
                        }
                        aria-label={t("table.score")}
                    >
                        {filters.scoreSortDirection === "asc" ? (
                            <ArrowUp className="h-4 w-4 min-[400px]:mr-1" />
                        ) : filters.scoreSortDirection === "desc" ? (
                            <ArrowDown className="h-4 w-4 min-[400px]:mr-1" />
                        ) : (
                            <ArrowUpDown className="h-4 w-4 min-[400px]:mr-1" />
                        )}
                        <span className="hidden min-[400px]:inline">{t("table.score")}</span>
                    </Button>

                    {filters.hasAnySetting && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 text-muted-foreground"
                            onClick={filters.clearAll}
                        >
                            {t("table.clearFilters")}
                        </Button>
                    )}
                </div>
            </div>

            {filters.selectedGenres.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {filters.selectedGenres.map((genre) => (
                        <Badge
                            key={genre}
                            variant="secondary"
                            className="cursor-pointer"
                            onClick={() =>
                                filters.setSelectedGenres((prev) => prev.filter((g) => g !== genre))
                            }
                        >
                            {t(`songs:genreNames.${genre}`)} &times;
                        </Badge>
                    ))}
                </div>
            )}

            {filters.hasActiveFilters && (
                <p className="text-sm text-muted-foreground">
                    {t("table.showingFiltered", { count: filters.filteredReviews.length, total: totalReviews })}
                </p>
            )}
        </>
    );
};

export default ReviewsToolbar;
