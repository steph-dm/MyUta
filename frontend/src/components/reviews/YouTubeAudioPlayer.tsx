import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  ExternalLink,
  Loader2,
} from "lucide-react";

interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  mute(): void;
  unMute(): void;
  destroy(): void;
}

interface YTStateEvent {
  data: number;
}

declare global {
  interface Window {
    YT: {
      Player: new (el: HTMLElement, config: Record<string, unknown>) => YTPlayer;
    };
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

let ytApiReady = false;
let ytApiPromise: Promise<void> | null = null;

function loadYTApi(): Promise<void> {
  if (ytApiReady) return Promise.resolve();
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise<void>((resolve) => {
    if (window.YT && window.YT.Player) {
      ytApiReady = true;
      resolve();
      return;
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      ytApiReady = true;
      resolve();
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });
  return ytApiPromise;
}

function extractVideoId(url: string): string | null {
  const m = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
  );
  return m ? m[1] : null;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface YouTubeAudioPlayerProps {
  url: string;
  autoPlay?: boolean;
  className?: string;
}

const YouTubeAudioPlayer = ({
  url,
  autoPlay = false,
  className,
}: YouTubeAudioPlayerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const { t } = useTranslation("common");

  const videoId = extractVideoId(url);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    intervalRef.current = setInterval(() => {
      const p = playerRef.current;
      if (p && typeof p.getCurrentTime === "function") {
        setCurrentTime(p.getCurrentTime());
        if (!duration && typeof p.getDuration === "function") {
          const d = p.getDuration();
          if (d > 0) setDuration(d);
        }
      }
    }, 50);
  }, [stopPolling, duration]);

  useEffect(() => {
    if (!videoId) return;

    let destroyed = false;

    loadYTApi().then(() => {
      if (destroyed || !containerRef.current) return;

      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        height: "0",
        width: "0",
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
        },
        events: {
          onReady: () => {
            if (destroyed) return;
            setReady(true);
            const d = playerRef.current?.getDuration();
            if (d && d > 0) setDuration(d);
            if (autoPlay) {
              setLoading(true);
              playerRef.current?.playVideo();
            }
          },
          onStateChange: (e: YTStateEvent) => {
            if (destroyed) return;
            if (e.data === 3) {
              setLoading(true);
            } else if (e.data === 1) {
              setLoading(false);
              setPlaying(true);
              startPolling();
            } else {
              setLoading(false);
              setPlaying(false);
              stopPolling();
              if (playerRef.current?.getCurrentTime) {
                setCurrentTime(playerRef.current.getCurrentTime());
              }
            }
          },
        },
      });
    });

    return () => {
      destroyed = true;
      stopPolling();
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
  }, [autoPlay, startPolling, stopPolling, videoId]);

  const togglePlay = () => {
    if (!playerRef.current) return;
    if (playing) {
      playerRef.current.pauseVideo();
    } else {
      setLoading(true);
      playerRef.current.playVideo();
    }
  };

  const toggleMute = () => {
    if (!playerRef.current) return;
    if (muted) {
      playerRef.current.unMute();
      setMuted(false);
    } else {
      playerRef.current.mute();
      setMuted(true);
    }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!playerRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(
      0,
      Math.min(1, (e.clientX - rect.left) / rect.width),
    );
    playerRef.current.seekTo(ratio * duration, true);
    setCurrentTime(ratio * duration);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!videoId)
    return <span className="text-muted-foreground text-sm">{t("errors.invalidUrl")}</span>;

  return (
    <div className={`flex items-center gap-1.5 h-8 select-none border border-border rounded-full px-2 ${className ?? "w-[220px]"}`}>
      <div ref={containerRef} className="hidden" />

      <button
        onClick={togglePlay}
        disabled={!ready || loading}
        className="flex-shrink-0 h-5 w-5 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : playing ? (
          <Pause className="h-3.5 w-3.5" />
        ) : (
          <Play className="h-3.5 w-3.5" />
        )}
      </button>

      <span className="text-[10px] tabular-nums text-muted-foreground flex-shrink-0 w-[32px] text-right">
        {formatTime(currentTime)}
      </span>

      <div
        className="flex-1 h-1.5 bg-muted rounded-full cursor-pointer relative group"
        onClick={seek}
      >
        <div
          className="absolute inset-y-0 left-0 bg-primary rounded-full transition-[width] duration-100"
          style={{ width: `${progress}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-3 w-3 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ left: `calc(${progress}% - 6px)` }}
        />
      </div>

      <span className="text-[10px] tabular-nums text-muted-foreground flex-shrink-0 w-[32px]">
        {duration > 0 ? formatTime(duration) : "--:--"}
      </span>

      <button
        onClick={toggleMute}
        disabled={!ready}
        className="flex-shrink-0 h-5 w-5 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
      >
        {muted ? (
          <VolumeX className="h-3.5 w-3.5" />
        ) : (
          <Volume2 className="h-3.5 w-3.5" />
        )}
      </button>

      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-shrink-0 h-5 w-5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  );
};

export default YouTubeAudioPlayer;
