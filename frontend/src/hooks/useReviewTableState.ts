import { useCallback, useDeferredValue, useMemo, useState } from "react";
import type { Genre, ReviewFilter, ReviewSort } from "@/gql/graphql";
import { addDays, todayISO } from "@/lib/dates";
import { PAGE_SIZES } from "@/lib/utils";

export type DatePreset = "day" | "week" | "month" | "year" | "custom" | null;
export type ScoreSort = "desc" | "asc" | null;

/** Filter, sort, page and selection state of a reviews table (server-side filtering). */
export function useReviewTableState(baseFilter: ReviewFilter = {}) {
  const [search, setSearchRaw] = useState("");
  const [genres, setGenresRaw] = useState<Genre[]>([]);
  const [datePreset, setDatePresetRaw] = useState<DatePreset>(null);
  const [customFrom, setCustomFromRaw] = useState("");
  const [customTo, setCustomToRaw] = useState("");
  const [scoreSort, setScoreSortRaw] = useState<ScoreSort>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeRaw] = useState<number>(PAGE_SIZES[0]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const deferredSearch = useDeferredValue(search);

  // Every filter change goes back to the first page.
  const resetPage =
    <T>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      setPage(1);
    };
  const setSearch = resetPage(setSearchRaw);
  const setGenres = resetPage(setGenresRaw);
  const setDatePreset = resetPage(setDatePresetRaw);
  const setCustomFrom = resetPage(setCustomFromRaw);
  const setCustomTo = resetPage(setCustomToRaw);
  const setScoreSort = resetPage(setScoreSortRaw);
  const setPageSize = (s: number) => {
    setPageSizeRaw(s);
    setPage(1);
    setSelected(new Set());
  };
  const goToPage = (p: number) => {
    setPage(p);
    setSelected(new Set());
  };

  const range = useMemo(() => {
    const today = todayISO();
    switch (datePreset) {
      case "day":
        return { from: today, to: today };
      case "week":
        return { from: addDays(today, -6), to: today };
      case "month":
        return { from: addDays(today, -29), to: today };
      case "year":
        return { from: addDays(today, -364), to: today };
      case "custom":
        return { from: customFrom || null, to: customTo || null };
      default:
        return { from: null, to: null };
    }
  }, [datePreset, customFrom, customTo]);

  const baseKey = JSON.stringify(baseFilter);
  const base = useMemo(() => JSON.parse(baseKey) as ReviewFilter, [baseKey]);
  const filter: ReviewFilter = useMemo(
    () => ({
      ...base,
      search: deferredSearch.trim() || null,
      genres: genres.length ? genres : null,
      dateFrom: range.from,
      dateTo: range.to,
    }),
    // baseFilter is compared by value, so parents may pass a new object each render
    [base, deferredSearch, genres, range],
  );
  const sort: ReviewSort =
    scoreSort === "desc" ? "SCORE_DESC" : scoreSort === "asc" ? "SCORE_ASC" : "DATE_DESC";
  const hasFilters = !!(search || genres.length || datePreset);

  /** Removes selected ids that are no longer on the page (instead of clearing everything). */
  const pruneSelection = useCallback((visibleIds: readonly string[]) => {
    setSelected((prev) => {
      const keep = new Set([...prev].filter((id) => visibleIds.includes(id)));
      return keep.size === prev.size ? prev : keep;
    });
  }, []);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearAll = () => {
    setSearchRaw("");
    setGenresRaw([]);
    setDatePresetRaw(null);
    setCustomFromRaw("");
    setCustomToRaw("");
    setScoreSortRaw(null);
    setPage(1);
  };

  return {
    search,
    setSearch,
    genres,
    setGenres,
    datePreset,
    setDatePreset,
    customFrom,
    setCustomFrom,
    customTo,
    setCustomTo,
    scoreSort,
    setScoreSort,
    page,
    setPage: goToPage,
    pageSize,
    setPageSize,
    selected,
    setSelected,
    toggle,
    pruneSelection,
    filter,
    sort,
    hasFilters,
    clearAll,
  };
}

export type ReviewTableState = ReturnType<typeof useReviewTableState>;
