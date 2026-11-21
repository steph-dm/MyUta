import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PlayerProvider, usePlayer } from "@/contexts/PlayerContext";
import FloatingPlayer from "./FloatingPlayer";

const created: string[] = [];
const destroyed: string[] = [];

beforeEach(() => {
  created.length = 0;
  destroyed.length = 0;
  window.YT = {
    PlayerState: { ENDED: 0 },
    Player: vi.fn(function (this: unknown, _el: HTMLElement, cfg: Record<string, unknown>) {
      created.push(cfg.videoId as string);
      return { destroy: () => destroyed.push(cfg.videoId as string) };
    }) as never,
  };
});

function Controls() {
  const p = usePlayer();
  return (
    <>
      <button
        onClick={() => p.play({ url: "https://youtu.be/aaaaaaaaaaa", title: "One", artist: "A" })}
      >
        one
      </button>
      <button
        onClick={() => p.play({ url: "https://youtu.be/bbbbbbbbbbb", title: "Two", artist: "B" })}
      >
        two
      </button>
    </>
  );
}

describe("FloatingPlayer", () => {
  it("is one global player: starting another song replaces the first (FE-04)", async () => {
    render(
      <PlayerProvider>
        <Controls />
        <FloatingPlayer />
      </PlayerProvider>,
    );
    await act(async () => screen.getByText("one").click());
    expect(created).toEqual(["aaaaaaaaaaa"]);
    await act(async () => screen.getByText("two").click());
    expect(created).toEqual(["aaaaaaaaaaa", "bbbbbbbbbbb"]);
    expect(destroyed).toEqual(["aaaaaaaaaaa"]);
    expect(screen.getByRole("complementary")).toHaveTextContent("Two");
    expect(screen.getByRole("link", { name: /YouTube/ })).toHaveAttribute(
      "href",
      "https://www.youtube.com/watch?v=bbbbbbbbbbb",
    );
  });
});
