import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export interface Track {
  url: string;
  title: string;
  artist: string;
}

interface PlayerContextValue {
  queue: Track[];
  index: number;
  current: Track | null;
  /** Plays one track (replacing the queue). */
  play: (track: Track) => void;
  /** Plays a list in order, e.g. the favourites ("practice queue"). */
  playAll: (tracks: Track[], startAt?: number) => void;
  next: () => void;
  previous: () => void;
  stop: () => void;
  isPlaying: (url: string | null | undefined) => boolean;
}

const PlayerContext = createContext<PlayerContextValue | undefined>(undefined);

/** One player for the whole app: starting a song anywhere replaces what is playing. */
export function PlayerProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<Track[]>([]);
  const [index, setIndex] = useState(0);

  const play = useCallback((track: Track) => {
    setQueue([track]);
    setIndex(0);
  }, []);
  const playAll = useCallback((tracks: Track[], startAt = 0) => {
    setQueue(tracks);
    setIndex(Math.min(Math.max(startAt, 0), Math.max(tracks.length - 1, 0)));
  }, []);
  const stop = useCallback(() => {
    setQueue([]);
    setIndex(0);
  }, []);
  const next = useCallback(
    () => setIndex((i) => (i + 1 < queue.length ? i + 1 : i)),
    [queue.length],
  );
  const previous = useCallback(() => setIndex((i) => (i > 0 ? i - 1 : i)), []);

  const current = queue[index] ?? null;
  const isPlaying = useCallback(
    (url: string | null | undefined) => !!url && current?.url === url,
    [current],
  );

  const value = useMemo(
    () => ({ queue, index, current, play, playAll, next, previous, stop, isPlaying }),
    [queue, index, current, play, playAll, next, previous, stop, isPlaying],
  );
  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}
