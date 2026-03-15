import { useState, useMemo, useDeferredValue, useEffect } from "react";
import type { Review } from "../types";
import { parseDateValue } from "../lib/utils";

const ITEMS_PER_PAGE = 5;

export interface ReviewFiltersState {
    searchQuery: string;
    selectedGenres: string[];
    scoreSortDirection: "asc" | "desc" | null;
    genreFilterOpen: boolean;
    dateFilterOpen: boolean;
    datePreset: string | null;
    customDateFrom: string;
    customDateTo: string;
    hoveredNoteId: string | null;
    hoveredIssuesId: string | null;
    currentPage: number;
    selectedIds: Set<string>;
}

export interface ReviewFiltersActions {
    setSearchQuery: (q: string) => void;
    setSelectedGenres: React.Dispatch<React.SetStateAction<string[]>>;
    setScoreSortDirection: React.Dispatch<React.SetStateAction<"asc" | "desc" | null>>;
    setGenreFilterOpen: (open: boolean) => void;
    setDateFilterOpen: (open: boolean) => void;
    setDatePreset: (preset: string | null) => void;
    setCustomDateFrom: (d: string) => void;
    setCustomDateTo: (d: string) => void;
    setHoveredNoteId: (id: string | null) => void;
    setHoveredIssuesId: (id: string | null) => void;
    setCurrentPage: (page: number) => void;
    setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
    toggleSelectAll: () => void;
    toggleSelect: (id: string) => void;
    clearAll: () => void;
}

export interface ReviewFiltersComputed {
    filteredReviews: Review[];
    paginatedReviews: Review[];
    totalPages: number;
    safeCurrentPage: number;
    hasActiveFilters: boolean;
    hasAnySetting: boolean;
    allPageSelected: boolean;
    dateRange: { from: Date; to: Date } | null;
    dateLabel: string | null;
}

export type UseReviewFiltersReturn = ReviewFiltersState & ReviewFiltersActions & ReviewFiltersComputed;

export const useReviewFilters = (
    reviews: Review[],
    t: (key: string, options?: Record<string, unknown>) => string,
): UseReviewFiltersReturn => {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
    const [scoreSortDirection, setScoreSortDirection] = useState<"asc" | "desc" | null>(null);
    const [genreFilterOpen, setGenreFilterOpen] = useState(false);
    const [dateFilterOpen, setDateFilterOpen] = useState(false);
    const [datePreset, setDatePreset] = useState<string | null>(null);
    const [customDateFrom, setCustomDateFrom] = useState("");
    const [customDateTo, setCustomDateTo] = useState("");
    const [hoveredNoteId, setHoveredNoteId] = useState<string | null>(null);
    const [hoveredIssuesId, setHoveredIssuesId] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Clear selections when reviews change (e.g. after refetch/deletion)
    useEffect(() => {
        setSelectedIds(new Set());
    }, [reviews]);

    const getDateRange = (): { from: Date; to: Date } | null => {
        if (datePreset === "custom") {
            if (!customDateFrom && !customDateTo) return null;
            const from = customDateFrom
                ? new Date(customDateFrom + "T00:00:00")
                : new Date(0);
            const to = customDateTo
                ? new Date(customDateTo + "T23:59:59")
                : new Date();
            return { from, to };
        }
        if (!datePreset) return null;
        const now = new Date();
        const to = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            23, 59, 59,
        );
        const from = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            0, 0, 0,
        );
        switch (datePreset) {
            case "day":
                break;
            case "week":
                from.setDate(from.getDate() - 6);
                break;
            case "month":
                from.setMonth(from.getMonth() - 1);
                break;
            case "year":
                from.setFullYear(from.getFullYear() - 1);
                break;
        }
        return { from, to };
    };

    const dateRange = getDateRange();
    const dateLabel =
        datePreset === "day"
            ? t("datePresets.lastDay")
            : datePreset === "week"
                ? t("datePresets.lastWeek")
                : datePreset === "month"
                    ? t("datePresets.lastMonth")
                    : datePreset === "year"
                        ? t("datePresets.lastYear")
                        : datePreset === "custom"
                            ? t("datePresets.custom")
                            : null;

    const deferredSearchQuery = useDeferredValue(searchQuery);

    const filteredReviews = useMemo(() => {
        let result = [...reviews];

        if (deferredSearchQuery.trim()) {
            const query = deferredSearchQuery.toLowerCase();
            result = result.filter(
                (r) =>
                    r.song.title.toLowerCase().includes(query) ||
                    r.song.artist.name.toLowerCase().includes(query),
            );
        }

        if (selectedGenres.length > 0) {
            result = result.filter((r) =>
                r.song.genres.some((g) => selectedGenres.includes(g)),
            );
        }

        if (dateRange) {
            result = result.filter((r) => {
                const d = parseDateValue(r.date);
                return d >= dateRange.from && d <= dateRange.to;
            });
        }

        if (scoreSortDirection) {
            result.sort((a, b) =>
                scoreSortDirection === "asc" ? a.score - b.score : b.score - a.score,
            );
        }

        return result;
    }, [reviews, deferredSearchQuery, selectedGenres, dateRange, scoreSortDirection]);

    const totalPages = Math.max(1, Math.ceil(filteredReviews.length / ITEMS_PER_PAGE));
    const safeCurrentPage = Math.min(currentPage, totalPages);
    const paginatedReviews = filteredReviews.slice(
        (safeCurrentPage - 1) * ITEMS_PER_PAGE,
        safeCurrentPage * ITEMS_PER_PAGE,
    );

    const hasActiveFilters = !!(searchQuery || selectedGenres.length > 0 || datePreset);
    const hasAnySetting = hasActiveFilters || !!scoreSortDirection;

    const allPageSelected =
        paginatedReviews.length > 0 &&
        paginatedReviews.every((r) => selectedIds.has(r.id));

    const toggleSelectAll = () => {
        if (allPageSelected) {
            const newSet = new Set(selectedIds);
            paginatedReviews.forEach((r) => newSet.delete(r.id));
            setSelectedIds(newSet);
        } else {
            const newSet = new Set(selectedIds);
            paginatedReviews.forEach((r) => newSet.add(r.id));
            setSelectedIds(newSet);
        }
    };

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const clearAll = () => {
        setSearchQuery("");
        setSelectedGenres([]);
        setScoreSortDirection(null);
        setDatePreset(null);
        setCustomDateFrom("");
        setCustomDateTo("");
        setCurrentPage(1);
    };

    return {
        // State
        searchQuery,
        selectedGenres,
        scoreSortDirection,
        genreFilterOpen,
        dateFilterOpen,
        datePreset,
        customDateFrom,
        customDateTo,
        hoveredNoteId,
        hoveredIssuesId,
        currentPage,
        selectedIds,
        // Actions
        setSearchQuery,
        setSelectedGenres,
        setScoreSortDirection,
        setGenreFilterOpen,
        setDateFilterOpen,
        setDatePreset,
        setCustomDateFrom,
        setCustomDateTo,
        setHoveredNoteId,
        setHoveredIssuesId,
        setCurrentPage,
        setSelectedIds,
        toggleSelectAll,
        toggleSelect,
        clearAll,
        // Computed
        filteredReviews,
        paginatedReviews,
        totalPages,
        safeCurrentPage,
        hasActiveFilters,
        hasAnySetting,
        allPageSelected,
        dateRange,
        dateLabel,
    };
};
