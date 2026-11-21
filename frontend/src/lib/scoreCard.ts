import type { Genre, MachineType } from "@/gql/graphql";
import { avatarColor, initials } from "./avatar";
import { GENRE_HEX } from "./constants";
import { formatDay } from "./dates";
import { downloadBlob, safeFilename } from "./download";
import { BAND_HEX, MACHINES, scoreBand } from "./machines";

const W = 460;
const H = 280;
const FONT =
  'system-ui, -apple-system, "Hiragino Sans", "Yu Gothic UI", "Noto Sans JP", sans-serif';

export interface ScoreCardData {
  score: number;
  date: string;
  machineType: MachineType;
  keyChange: number;
  song: { title: string; genres: Genre[]; artist: { name: string } };
}

export interface ScoreCardText {
  genreLabel: (g: Genre) => string;
  shareTitle: string;
  userName?: string;
  userEmail?: string;
  /** Shown bottom-right; defaults to the current host. */
  site?: string;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  // Fallback for browsers without CanvasRenderingContext2D.roundRect
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fit(ctx: CanvasRenderingContext2D, text: string, max: number): string {
  if (ctx.measureText(text).width <= max) return text;
  const chars = Array.from(text);
  while (chars.length > 1 && ctx.measureText(chars.join("") + "…").width > max) chars.pop();
  return chars.join("") + "…";
}

function badge(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  bg: string,
  fg: string,
): number {
  ctx.font = `bold 11px ${FONT}`;
  const w = ctx.measureText(text).width + 18;
  ctx.fillStyle = bg;
  roundRect(ctx, x, y, w, 20, 10);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + 9, y + 10);
  return w;
}

/** Draws a shareable PNG of one take and shares or downloads it. */
export async function shareScoreCard(review: ScoreCardData, text: ScoreCardText): Promise<void> {
  const canvas = document.createElement("canvas");
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(dpr, dpr);
  const machine = MACHINES[review.machineType];
  const color = BAND_HEX[scoreBand(review.score, review.machineType)];

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#0c0820");
  bg.addColorStop(1, "#1e1252");
  ctx.fillStyle = bg;
  roundRect(ctx, 0, 0, W, H, 16);
  ctx.fill();

  ctx.fillStyle = "#c4b5fd";
  ctx.font = `bold 12px ${FONT}`;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillText("マイウタ", W - 24, 30);

  const cx = 95;
  const cy = 135;
  ctx.beginPath();
  ctx.arc(cx, cy, 60, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(
    cx,
    cy,
    56,
    -Math.PI / 2,
    -Math.PI / 2 + (Math.PI * 2 * Math.min(review.score, 100)) / 100,
  );
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.font = `bold 26px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText(review.score.toFixed(3), cx, cy);

  const x = 185;
  const maxW = W - x - 24;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#f1f5f9";
  ctx.font = `bold 20px ${FONT}`;
  ctx.fillText(fit(ctx, review.song.title, maxW), x, 92);
  ctx.fillStyle = "#94a3b8";
  ctx.font = `13px ${FONT}`;
  ctx.fillText(fit(ctx, review.song.artist.name, maxW), x, 120);

  let bx = x;
  bx += badge(ctx, machine.label, bx, 146, machine.hex, "#fff") + 5;
  if (review.keyChange) {
    bx +=
      badge(
        ctx,
        `${review.keyChange > 0 ? "+" : ""}${review.keyChange}`,
        bx,
        146,
        "#334155",
        "#e2e8f0",
      ) + 5;
  }
  for (const g of review.song.genres) {
    const label = text.genreLabel(g);
    ctx.font = `bold 11px ${FONT}`;
    if (bx + ctx.measureText(label).width + 18 > W - 20) break;
    bx += badge(ctx, label, bx, 146, GENRE_HEX[g].bg, GENRE_HEX[g].text) + 4;
  }

  const fy = H - 26;
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#64748b";
  ctx.font = `11px ${FONT}`;
  ctx.fillText(formatDay(review.date), 24, fy);
  if (text.userName || text.userEmail) {
    const name = text.userName || (text.userEmail ?? "").split("@")[0]!;
    const w = ctx.measureText(name).width + 21;
    const sx = (W - w) / 2;
    ctx.fillStyle = avatarColor(name).hex;
    ctx.beginPath();
    ctx.arc(sx + 8, fy, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = `bold 7px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(initials(name), sx + 8, fy + 1);
    ctx.textAlign = "left";
    ctx.fillStyle = "#94a3b8";
    ctx.font = `11px ${FONT}`;
    ctx.fillText(name, sx + 21, fy);
  }
  ctx.textAlign = "right";
  ctx.fillStyle = "#6d63a8";
  ctx.font = `bold 10px ${FONT}`;
  ctx.fillText(text.site ?? window.location.host, W - 24, fy);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) return;
  const filename = `myuta-${safeFilename(review.song.title, "score-card")}.png`;
  const file = new File([blob], filename, { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: text.shareTitle });
      return;
    } catch {
      // cancelled or unsupported: fall back to download
    }
  }
  downloadBlob(blob, filename);
}
