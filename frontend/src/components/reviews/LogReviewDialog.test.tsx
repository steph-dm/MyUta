import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { MockedResponse } from "@apollo/client/testing";
import { ARTIST_OPTIONS, ARTIST_SONG_OPTIONS } from "@/graphql/library";
import { renderWithProviders } from "@/test/utils";
import LogReviewDialog from "./LogReviewDialog";

const ocrResult = {
  __typename: "ExtractedReview",
  songTitle: "アイドル",
  artistName: "ＹＯＡＳＯＢＩ",
  songTitleAlt: null,
  artistNameAlt: null,
  score: 91.23456,
  date: "2026-11-20",
  machineType: "KSTAGE",
  notes: null,
  genres: ["ANIME"],
  issues: [],
  details: null,
};

vi.mock("@/lib/heic", async (orig) => ({
  ...(await orig<typeof import("@/lib/heic")>()),
  heicToJpeg: vi.fn(
    async (f: File) =>
      new File(["jpeg"], f.name.replace(/\.heic$/i, ".jpg"), { type: "image/jpeg" }),
  ),
}));

vi.mock("@/lib/upload", () => ({
  uploadMutation: vi.fn(async () => ({ extractReviewFromImage: ocrResult })),
}));

const artistsMock: MockedResponse = {
  request: { query: ARTIST_OPTIONS, variables: { search: "ＹＯＡＳＯＢＩ" } },
  result: {
    data: {
      artists: {
        __typename: "ArtistPage",
        items: [{ __typename: "Artist", id: "a1", name: "YOASOBI", songCount: 1 }],
      },
    },
  },
};
const songsMock = (songs: { id: string; title: string }[]): MockedResponse => ({
  request: { query: ARTIST_SONG_OPTIONS, variables: { id: "a1" } },
  result: {
    data: {
      artist: {
        __typename: "Artist",
        id: "a1",
        songs: songs.map((s) => ({
          __typename: "Song",
          ...s,
          genres: ["ANIME"],
          youtubeUrl: null,
          generatedYoutube: false,
        })),
      },
    },
  },
  maxUsageCount: 5,
});

async function readScreenshot() {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]:not([capture])')!;
  fireEvent.change(input, {
    target: { files: [new File(["\x89PNG"], "shot.png", { type: "image/png" })] },
  });
}

describe("LogReviewDialog screenshot import", () => {
  it("keeps the song when the artist already exists (FE-01) and matches across width", async () => {
    renderWithProviders(<LogReviewDialog open onOpenChange={() => undefined} />, [
      artistsMock,
      songsMock([{ id: "s1", title: "アイドル" }]),
    ]);
    await screen.findByText("Read from photo");
    await readScreenshot();
    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "Song" })).toHaveTextContent("アイドル"),
    );
    expect(screen.getByRole("combobox", { name: "Artist" })).toHaveTextContent("YOASOBI");
    // existing song: no "New" badge and no new-song fields
    expect(screen.getByRole("combobox", { name: "Song" })).not.toHaveTextContent("New");
    expect(screen.queryByText("Genres")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Score (0–100)")).toHaveValue(91.235);
    expect(screen.getByRole("radio", { name: "K-STAGE" })).toHaveAttribute("aria-checked", "true");
  });

  it("offers a new song under the existing artist when the title is unknown", async () => {
    renderWithProviders(<LogReviewDialog open onOpenChange={() => undefined} />, [
      artistsMock,
      songsMock([{ id: "s2", title: "夜に駆ける" }]),
    ]);
    await screen.findByText("Read from photo");
    await readScreenshot();
    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "Song" })).toHaveTextContent("アイドル"),
    );
    expect(screen.getByRole("combobox", { name: "Song" })).toHaveTextContent("New");
    expect(screen.getByRole("combobox", { name: "Artist" })).not.toHaveTextContent("New");
    expect(screen.getByText("Genres")).toBeInTheDocument();
  });

  it("validates before sending", async () => {
    renderWithProviders(<LogReviewDialog open onOpenChange={() => undefined} />);
    fireEvent.click(await screen.findByRole("button", { name: "Save take" }));
    expect(await screen.findByText("Choose or add an artist.")).toBeInTheDocument();
    expect(screen.getByText("Enter a score between 0 and 100.")).toBeInTheDocument();
  });
});

describe("LogReviewDialog with a photo from the Share menu", () => {
  it("shows the shared photo as an attachment and reads it only when asked", async () => {
    const { uploadMutation } = await import("@/lib/upload");
    vi.mocked(uploadMutation).mockClear();
    const shared = new File([new Uint8Array([0x89, 0x50])], "Screenshot_20261121.png", {
      type: "image/png",
    });
    renderWithProviders(
      <LogReviewDialog open onOpenChange={() => undefined} initialImage={shared} />,
      [artistsMock, songsMock([{ id: "s1", title: "アイドル" }])],
    );
    const group = await screen.findByRole("group", { name: "Result photo" });
    expect(group).toHaveTextContent("Screenshot_20261121.png");
    expect(group).toHaveTextContent("Photo received from Share");
    expect(
      screen.getByRole("img", { name: "Preview of Screenshot_20261121.png" }),
    ).toBeInTheDocument();
    expect(uploadMutation).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Read result" }));
    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "Song" })).toHaveTextContent("アイドル"),
    );
    expect(vi.mocked(uploadMutation).mock.calls[0]![3]).toBe(shared);
    expect(screen.getByRole("button", { name: "Read again" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove photo" }));
    expect(screen.queryByRole("group", { name: "Result photo" })).not.toBeInTheDocument();
  });

  it("explains when the photo is too large to read", async () => {
    const big = new File([new Uint8Array(11 * 1024 * 1024)], "huge.jpg", { type: "image/jpeg" });
    renderWithProviders(<LogReviewDialog open onOpenChange={() => undefined} initialImage={big} />);
    expect(await screen.findByText(/larger than 10 MB/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Read result" })).not.toBeInTheDocument();
  });
});

describe("HEIC photos", () => {
  it("converts a shared HEIC photo to JPEG before attaching it", async () => {
    const { heicToJpeg } = await import("@/lib/heic");
    const heic = new File(["heic"], "IMG_1234.HEIC", { type: "image/heic" });
    renderWithProviders(
      <LogReviewDialog open onOpenChange={() => undefined} initialImage={heic} />,
    );
    const group = await screen.findByRole("group", { name: "Result photo" });
    await waitFor(() => expect(group).toHaveTextContent("IMG_1234.jpg"));
    expect(heicToJpeg).toHaveBeenCalledWith(heic);
    expect(screen.getByRole("button", { name: "Read result" })).toBeInTheDocument();
  });
});
