import type { Genre, Review } from "../types";
import { parseDateValue } from "./utils";
import { trackEvent } from "./analytics";

const CARD_WIDTH = 460;
const CARD_HEIGHT = 280;
const FONT = "system-ui, -apple-system, sans-serif";

const GENRE_CANVAS_COLORS: Record<Genre, { bg: string; text: string }> = {
  ANIME: { bg: "#ddd6fe", text: "#5b21b6" },
  CLASSICAL: { bg: "#d1fae5", text: "#065f46" },
  ELECTRO: { bg: "#cffafe", text: "#155e75" },
  FOLK: { bg: "#ffedd5", text: "#9a3412" },
  HIPHOP: { bg: "#fef3c7", text: "#92400e" },
  JAZZ: { bg: "#e0e7ff", text: "#3730a3" },
  POP: { bg: "#fce7f3", text: "#9d174d" },
  ROCK: { bg: "#fee2e2", text: "#991b1b" },
};

const AVATAR_HEX_COLORS = [
  "#3b82f6", "#a855f7", "#22c55e", "#f97316", "#ec4899", "#14b8a6",
];

interface UserInfo {
  name: string;
  email: string;
}

function getScoreColor(score: number): string {
  if (score >= 90) return "#22c55e";
  if (score >= 80) return "#3b82f6";
  if (score >= 70) return "#facc15";
  return "#ef4444";
}

function getInitials(name: string, email: string): string {
  return (name || email)
    .split(/[\s@]+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getAvatarColor(name: string): string {
  const idx =
    name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) %
    AVATAR_HEX_COLORS.length;
  return AVATAR_HEX_COLORS[idx];
}

function getMachineColors(type: string): { bg: string; text: string } {
  if (type === "JOYSOUND") return { bg: "#7c3aed", text: "#ffffff" };
  return { bg: "#3b82f6", text: "#ffffff" };
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  let display = text;
  while (ctx.measureText(display).width > maxWidth && display.length > 3) {
    display = display.slice(0, -4) + "…";
  }
  return display;
}

function drawBadge(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  colors: { bg: string; text: string },
  fontSize = 11,
): number {
  ctx.font = `bold ${fontSize}px ${FONT}`;
  const textWidth = ctx.measureText(text).width;
  const padX = 9;
  const badgeH = fontSize + 9;
  const badgeW = textWidth + padX * 2;

  ctx.fillStyle = colors.bg;
  roundRectPath(ctx, x, y, badgeW, badgeH, badgeH / 2);
  ctx.fill();

  ctx.fillStyle = colors.text;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + padX, y + badgeH / 2);

  return badgeW;
}

export function generateScoreCard(review: Review, user?: UserInfo, genreLabels?: Record<string, string>): void {
  const canvas = document.createElement("canvas");
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width = CARD_WIDTH * dpr;
  canvas.height = CARD_HEIGHT * dpr;
  canvas.style.width = `${CARD_WIDTH}px`;
  canvas.style.height = `${CARD_HEIGHT}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(dpr, dpr);

  trackEvent({ name: "share_score_card", data: { songTitle: review.song.title } });

  const scoreColor = getScoreColor(review.score);

  // ── Background ──
  const bg = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
  bg.addColorStop(0, "#0c0820");
  bg.addColorStop(0.6, "#161040");
  bg.addColorStop(1, "#1e1252");
  ctx.fillStyle = bg;
  roundRectPath(ctx, 0, 0, CARD_WIDTH, CARD_HEIGHT, 16);
  ctx.fill();

  // ── Glow behind score ring ──
  ctx.save();
  ctx.globalAlpha = 0.07;
  const glow = ctx.createRadialGradient(100, 130, 10, 100, 130, 120);
  glow.addColorStop(0, scoreColor);
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  ctx.restore();

  // ── Inner card surface ──
  ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
  roundRectPath(ctx, 12, 12, CARD_WIDTH - 24, CARD_HEIGHT - 24, 10);
  ctx.fill();

  // ═══════════════════════════════════
  // マイウタ branding — top right
  // ═══════════════════════════════════
  const brandX = CARD_WIDTH - 90;
  const brandY = 30;

  // Microphone icon
  ctx.fillStyle = "#1a1a2e";
  ctx.beginPath();
  ctx.arc(brandX, brandY, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#a78bfa";
  roundRectPath(ctx, brandX - 2.5, brandY - 4.5, 5, 7, 2.5);
  ctx.fill();
  ctx.strokeStyle = "#a78bfa";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(brandX, brandY + 1.5, 4.5, 0, Math.PI);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(brandX, brandY + 6);
  ctx.lineTo(brandX, brandY + 7.5);
  ctx.stroke();

  ctx.fillStyle = "#c4b5fd";
  ctx.font = `bold 12px ${FONT}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("マイウタ", brandX + 12, brandY);

  // ═══════════════════════════════════
  // SCORE RING — left, vertically centered
  // ═══════════════════════════════════
  const ringX = 95;
  const ringY = 135;
  const ringR = 60;

  // Outer glow
  ctx.save();
  ctx.globalAlpha = 0.1;
  ctx.beginPath();
  ctx.arc(ringX, ringY, ringR + 8, 0, Math.PI * 2);
  ctx.fillStyle = scoreColor;
  ctx.fill();
  ctx.restore();

  // Dark fill
  ctx.beginPath();
  ctx.arc(ringX, ringY, ringR, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fill();

  // Track
  ctx.beginPath();
  ctx.arc(ringX, ringY, ringR - 4, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
  ctx.lineWidth = 5;
  ctx.stroke();

  // Progress
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + (Math.PI * 2 * Math.min(review.score, 100)) / 100;
  ctx.beginPath();
  ctx.arc(ringX, ringY, ringR - 4, startAngle, endAngle);
  ctx.strokeStyle = scoreColor;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.lineCap = "butt";

  // Score text — .toFixed(3)
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold 28px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(review.score.toFixed(3), ringX, ringY);

  // ═══════════════════════════════════
  // RIGHT SIDE — song info + badges
  // ═══════════════════════════════════
  const rightX = 185;
  const maxTextW = CARD_WIDTH - rightX - 24;

  // Song title — aligned near ring center
  const titleY = ringY - 28;
  ctx.fillStyle = "#f1f5f9";
  ctx.font = `bold 20px ${FONT}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(fitText(ctx, review.song.title, maxTextW), rightX, titleY);

  // Artist
  ctx.fillStyle = "#94a3b8";
  ctx.font = `13px ${FONT}`;
  ctx.fillText(review.song.artist.name, rightX, titleY + 28);

  // Badges: machine + genres inline
  const badgeY = titleY + 50;
  let bx = rightX;
  bx += drawBadge(ctx, review.machineType, bx, badgeY, getMachineColors(review.machineType)) + 5;
  for (const genre of review.song.genres) {
    const colors = GENRE_CANVAS_COLORS[genre] || { bg: "#374151", text: "#e5e7eb" };
    const label = genreLabels?.[genre] ?? genre;
    const w = drawBadge(ctx, label, bx, badgeY, colors);
    bx += w + 4;
    if (bx > CARD_WIDTH - 20) break;
  }

  // ═══════════════════════════════════
  // FOOTER — date | user | myuta.app
  // ═══════════════════════════════════
  const footerY = CARD_HEIGHT - 26;

  // Date
  const dateObj = parseDateValue(review.date);
  const dateStr = `${dateObj.getFullYear()}/${String(dateObj.getMonth() + 1).padStart(2, "0")}/${String(dateObj.getDate()).padStart(2, "0")}`;
  ctx.fillStyle = "#475569";
  ctx.font = `11px ${FONT}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(dateStr, 24, footerY);

  // User (centered)
  if (user) {
    const initials = getInitials(user.name, user.email);
    const avatarColor = getAvatarColor(user.name);
    const displayName = user.name || user.email.split("@")[0];

    ctx.font = `11px ${FONT}`;
    const nameW = ctx.measureText(displayName).width;
    const totalW = 16 + 5 + nameW;
    const sx = (CARD_WIDTH - totalW) / 2;

    ctx.fillStyle = avatarColor;
    ctx.beginPath();
    ctx.arc(sx + 8, footerY, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.font = `bold 7px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initials, sx + 8, footerY + 1);

    ctx.fillStyle = "#64748b";
    ctx.font = `11px ${FONT}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(displayName, sx + 21, footerY);
  }

  // myuta.app
  ctx.fillStyle = "#4a4370";
  ctx.font = `bold 10px ${FONT}`;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillText("myuta.app", CARD_WIDTH - 24, footerY);

  // ── Export ──
  canvas.toBlob(async (blob) => {
    if (!blob) return;

    const safeTitle =
      review.song.title
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-+|-+$/g, "") || "score-card";
    const filename = `myuta-${safeTitle}.png`;
    const file = new File([blob], filename, { type: "image/png" });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `${review.song.title} - ${review.score}pts`,
        });
        return;
      } catch {
        // fall through to download
      }
    }

    downloadBlob(blob, filename);
  }, "image/png");
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
