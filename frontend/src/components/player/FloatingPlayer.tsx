import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ExternalLink, SkipBack, SkipForward, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlayer } from "@/contexts/PlayerContext";
import { videoId, watchUrl } from "@/lib/youtube";

interface YTPlayer {
  destroy(): void;
}
declare global {
  interface Window {
    YT?: {
      Player: new (el: HTMLElement, cfg: Record<string, unknown>) => YTPlayer;
      PlayerState: { ENDED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<void> | null = null;
function loadApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  apiPromise ??= new Promise<void>((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });
  return apiPromise;
}

/**
 * The one player of the app. It shows YouTube's own player at a size that
 * meets YouTube's minimum (200x200 viewport), with YouTube's controls.
 */
export default function FloatingPlayer() {
  const { t } = useTranslation();
  const { current, queue, index, next, previous, stop } = usePlayer();
  const host = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const id = videoId(current?.url);
  const hasQueue = queue.length > 1;
  // keep the latest "next" without re-creating the player when it changes
  const onEnded = useRef(next);
  useEffect(() => {
    onEnded.current = next;
  }, [next]);

  useEffect(() => {
    if (!id || !host.current) return;
    setFailed(false);
    let player: YTPlayer | null = null;
    let cancelled = false;
    const mount = document.createElement("div");
    host.current.replaceChildren(mount);
    loadApi().then(() => {
      if (cancelled || !window.YT) return;
      player = new window.YT.Player(mount, {
        videoId: id,
        width: "100%",
        height: "100%",
        playerVars: { autoplay: 1, playsinline: 1, rel: 0 },
        events: {
          // 101/150: the owner does not allow embedding; 100: removed; 2/5: invalid
          onError: () => setFailed(true),
          onStateChange: (e: { data: number }) => {
            if (e.data === window.YT?.PlayerState.ENDED) onEnded.current();
          },
        },
      });
    });
    return () => {
      cancelled = true;
      player?.destroy();
    };
  }, [id]);

  if (!current || !id) return null;

  return (
    <aside
      aria-label={t("player.title")}
      className="fixed bottom-0 inset-x-0 sm:inset-x-auto sm:bottom-4 sm:right-4 z-50 sm:w-[380px] bg-background border-t sm:border sm:rounded-lg shadow-lg"
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{current.title}</p>
          <p className="text-xs text-muted-foreground truncate">{current.artist}</p>
        </div>
        {hasQueue && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={previous}
              disabled={index === 0}
              aria-label={t("player.previous")}
            >
              <SkipBack className="h-4 w-4" aria-hidden="true" />
            </Button>
            <span className="text-xs tabular-nums text-muted-foreground">
              {t("player.queue", { index: index + 1, total: queue.length })}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={next}
              disabled={index >= queue.length - 1}
              aria-label={t("player.next")}
            >
              <SkipForward className="h-4 w-4" aria-hidden="true" />
            </Button>
          </>
        )}
        <a
          href={watchUrl(id)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
          aria-label={t("player.openOnYouTube")}
          title={t("player.openOnYouTube")}
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={stop}
          aria-label={t("actions.close")}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
      {failed ? (
        <p role="status" className="px-3 pb-3 text-sm text-muted-foreground">
          {t("player.unavailable")}{" "}
          <a className="underline" href={watchUrl(id)} target="_blank" rel="noopener noreferrer">
            {t("player.openOnYouTube")}
          </a>
        </p>
      ) : (
        <div
          className="aspect-video min-h-[200px] w-full bg-black sm:rounded-b-lg overflow-hidden"
          ref={host}
        />
      )}
    </aside>
  );
}
