import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useLocation } from "react-router-dom";
import { renderWithProviders } from "@/test/utils";
import Reviews from "./Reviews";

vi.mock("@/lib/shareTarget", async (orig) => ({
  ...(await orig<typeof import("@/lib/shareTarget")>()),
  takeSharedImage: vi.fn(async (id: string) =>
    id === "abc12345xyz" ? new File(["x"], "shared.jpg", { type: "image/jpeg" }) : null,
  ),
}));

function Where() {
  const loc = useLocation();
  return <output data-testid="where">{loc.pathname + loc.search}</output>;
}

describe("Reviews page opened from the Share menu", () => {
  it("opens Log a take with the shared photo attached and cleans the URL", async () => {
    renderWithProviders(
      <>
        <Reviews />
        <Where />
      </>,
      [],
      "/reviews?share=abc12345xyz",
    );
    const group = await screen.findByRole("group", { name: "Result photo" });
    expect(group).toHaveTextContent("shared.jpg");
    expect(screen.getByRole("dialog")).toHaveTextContent("Log a take");
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent(/^\/reviews$/));
  });

  it("explains when the share could not be received", async () => {
    renderWithProviders(<Reviews />, [], "/reviews?share=unavailable");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
