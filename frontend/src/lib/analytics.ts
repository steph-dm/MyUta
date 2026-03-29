declare global {
  interface Window {
    umami?: {
      track: (
        eventName: string,
        eventData?: Record<string, string | number | boolean>,
      ) => void;
    };
  }
}

type AnalyticsEvent =
  | { name: "login" }
  | { name: "register" }
  | { name: "logout" }
  | { name: "add_review"; data: { machineType: string; songTitle: string } }
  | { name: "edit_review"; data: { songTitle: string } }
  | { name: "delete_review" }
  | { name: "delete_reviews_bulk"; data: { count: number } }
  | { name: "add_song"; data: { title: string } }
  | { name: "edit_song"; data: { title: string } }
  | { name: "add_artist"; data: { name: string } }
  | { name: "edit_artist"; data: { name: string } }
  | { name: "toggle_favorite"; data: { type: "song" | "artist" } }
  | { name: "share_score_card"; data: { songTitle: string } }
  | { name: "export_data" }
  | { name: "import_data"; data: { reviewsImported: number } }
  | { name: "change_language"; data: { language: string } }
  | { name: "change_password" }
  | { name: "extract_review_from_image" }
  | { name: "search_youtube" };

export function trackEvent(event: AnalyticsEvent): void {
  try {
    if (window.umami) {
      const data = "data" in event ? event.data : undefined;
      window.umami.track(event.name, data);
    }
  } catch {
    // noop
  }
}
