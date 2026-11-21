import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useReviewTableState } from "./useReviewTableState";

describe("useReviewTableState", () => {
  it("keeps the selection when the parent re-renders with a new filter object (FE-03)", () => {
    const { result, rerender } = renderHook(
      ({ machine }) => useReviewTableState({ machineType: machine }),
      {
        initialProps: { machine: "DAM" as const },
      },
    );
    act(() => result.current.toggle("r1"));
    expect(result.current.selected.has("r1")).toBe(true);
    rerender({ machine: "DAM" as const }); // new object, same value
    rerender({ machine: "DAM" as const });
    expect(result.current.selected.size).toBe(1);
    const filter = result.current.filter;
    rerender({ machine: "DAM" as const });
    expect(result.current.filter).toBe(filter); // stable: no refetch loop
  });

  it("prunes ids that disappeared instead of clearing everything", () => {
    const { result } = renderHook(() => useReviewTableState());
    act(() => {
      result.current.toggle("a");
      result.current.toggle("b");
    });
    act(() => result.current.pruneSelection(["a", "c"]));
    expect([...result.current.selected]).toEqual(["a"]);
  });

  it("goes back to page 1 when a filter changes and maps presets to dates", () => {
    const { result } = renderHook(() => useReviewTableState());
    act(() => result.current.setPage(3));
    act(() => result.current.setDatePreset("week"));
    expect(result.current.page).toBe(1);
    expect(result.current.filter.dateFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    act(() => result.current.setScoreSort("asc"));
    expect(result.current.sort).toBe("SCORE_ASC");
  });
});
