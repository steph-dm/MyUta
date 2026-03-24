import { useState, useCallback } from "react";

export function useFloatingPlayer() {
  const [activePlayerUrl, setActivePlayerUrl] = useState<string | null>(null);
  const [activePlayerInfo, setActivePlayerInfo] = useState("");

  const play = useCallback((url: string, info: string) => {
    setActivePlayerUrl(url);
    setActivePlayerInfo(info);
  }, []);

  const stop = useCallback(() => {
    setActivePlayerUrl(null);
  }, []);

  return { activePlayerUrl, activePlayerInfo, play, stop } as const;
}
