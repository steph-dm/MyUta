import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { MockedResponse } from "@apollo/client/testing";
import { REVIEWS } from "@/graphql/reviews";
import { renderWithProviders } from "@/test/utils";
import ReviewsTable from "./ReviewsTable";

const review = (id: string, title: string, score: number, pb: boolean) => ({
  __typename: "Review",
  id,
  date: "2026-03-22",
  score,
  machineType: "DAM",
  keyChange: id === "r1" ? -2 : 0,
  variant: null,
  issues: ["RHYTHM"],
  notes: null,
  isPersonalBest: pb,
  createdAt: "2026-03-22T12:00:00Z",
  details: null,
  song: {
    __typename: "Song",
    id: `s-${id}`,
    title,
    genres: ["POP"],
    youtubeUrl: "javascript:alert(1)",
    artist: { __typename: "Artist", id: "a1", name: "YOASOBI" },
  },
});

const mock: MockedResponse = {
  request: {
    query: REVIEWS,
    variables: {
      filter: { machineType: "DAM", search: null, genres: null, dateFrom: null, dateTo: null },
      sort: "DATE_DESC",
      limit: 10,
      offset: 0,
    },
  },
  result: {
    data: {
      reviews: {
        __typename: "ReviewPage",
        totalCount: 2,
        items: [review("r1", "アイドル", 88.5, true), review("r2", "群青", 80, false)],
      },
    },
  },
  maxUsageCount: 3,
};

describe("ReviewsTable", () => {
  it("renders takes with personal best, key change and no player for unsafe links", async () => {
    renderWithProviders(<ReviewsTable filter={{ machineType: "DAM" }} caption="DAM takes" />, [
      mock,
    ]);
    const table = await screen.findByRole("table");
    expect(within(table).getByText("アイドル")).toBeInTheDocument();
    expect(within(table).getAllByText("2026/03/22")).toHaveLength(2);
    expect(within(table).getByText("88.500")).toBeInTheDocument();
    expect(within(table).getAllByText("Personal best")).toHaveLength(1);
    expect(within(table).getByText("Key -2")).toBeInTheDocument();
    // javascript: links never become a player button
    expect(within(table).queryByRole("button", { name: /^Play/ })).not.toBeInTheDocument();
    expect(screen.getByText("1–2 of 2")).toBeInTheDocument();
  });

  it("selects takes and offers bulk delete", async () => {
    renderWithProviders(<ReviewsTable filter={{ machineType: "DAM" }} caption="DAM takes" />, [
      mock,
    ]);
    const box = await screen.findByRole("checkbox", { name: /アイドル/ });
    fireEvent.click(box);
    expect(screen.getByRole("button", { name: "Delete selected (1)" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: "Select all takes on this page" }));
    expect(screen.getByRole("button", { name: "Delete selected (2)" })).toBeInTheDocument();
  });
});
