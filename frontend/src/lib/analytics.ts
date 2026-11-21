/**
 * Optional Umami analytics (cookieless). Only event names and non-personal
 * properties are sent: never song titles, artist names, notes or e-mail addresses.
 */
declare global {
  interface Window {
    umami?: { track: (event: string, data?: Record<string, string | number | boolean>) => void };
  }
}

type AnalyticsEvent =
  | { name: "login" | "register" | "logout" | "logout_everywhere" }
  | { name: "add_review"; data: { machineType: string; fromScreenshot: boolean } }
  | {
      name:
        | "edit_review"
        | "delete_reviews"
        | "edit_song"
        | "delete_song"
        | "edit_artist"
        | "merge_artists"
        | "delete_artist";
    }
  | { name: "toggle_favorite"; data: { type: "song" | "artist" } }
  | {
      name:
        | "set_goal"
        | "share_score_card"
        | "export_data"
        | "change_password"
        | "search_youtube"
        | "extract_review_from_image";
    }
  | { name: "import_data"; data: { reviewsImported: number } }
  | { name: "change_language"; data: { language: string } };

export function initAnalytics(): void {
  const src = import.meta.env.VITE_UMAMI_SCRIPT_URL;
  const websiteId = import.meta.env.VITE_UMAMI_WEBSITE_ID;
  if (!src || !websiteId) return;
  const script = document.createElement("script");
  script.defer = true;
  script.src = src;
  script.dataset.websiteId = websiteId;
  script.dataset.doNotTrack = "true";
  document.head.appendChild(script);
}

export const analyticsEnabled = () =>
  Boolean(import.meta.env.VITE_UMAMI_SCRIPT_URL && import.meta.env.VITE_UMAMI_WEBSITE_ID);

export function trackEvent(event: AnalyticsEvent): void {
  try {
    window.umami?.track(event.name, "data" in event ? event.data : undefined);
  } catch {
    // analytics must never break the app
  }
}
