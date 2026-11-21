import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

export const LANGUAGES = ["en", "ja"] as const;
export type AppLanguage = (typeof LANGUAGES)[number];
export const NAMESPACES = [
  "common",
  "auth",
  "dashboard",
  "reviews",
  "songs",
  "artists",
  "profile",
] as const;

// Each language/namespace is its own chunk; only the active language is downloaded.
const files = import.meta.glob<{ default: Record<string, unknown> }>("./locales/*/*.json");

i18n
  .use({
    type: "backend",
    read(language: string, namespace: string, callback: (err: unknown, data: unknown) => void) {
      const load = files[`./locales/${language}/${namespace}.json`];
      if (!load) {
        callback(new Error(`missing translations ${language}/${namespace}`), null);
        return;
      }
      load().then(
        (m) => callback(null, m.default),
        (err) => callback(err, null),
      );
    },
  })
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    supportedLngs: [...LANGUAGES],
    nonExplicitSupportedLngs: true, // "ja-JP" -> "ja"
    load: "languageOnly",
    fallbackLng: "en",
    ns: [...NAMESPACES],
    defaultNS: "common",
    interpolation: { escapeValue: false },
    detection: { order: ["localStorage", "navigator"], caches: ["localStorage"] },
    react: { useSuspense: true },
    showSupportNotice: false,
  });

/** Keeps <html lang> in line with the UI language (fonts, screen readers, line breaking). */
function syncDocumentLanguage(lng: string | undefined) {
  if (lng) document.documentElement.lang = lng.startsWith("ja") ? "ja" : "en";
}
i18n.on("languageChanged", syncDocumentLanguage);
syncDocumentLanguage(i18n.resolvedLanguage ?? i18n.language);

/**
 * Locale for Intl/localeCompare. Never pass i18n.language there: it is the raw detected
 * value and can be something like "en-US@posix", which Intl rejects with a RangeError.
 */
export const intlLocale = (): "ja-JP" | "en-US" => (currentLanguage() === "ja" ? "ja-JP" : "en-US");

export const currentLanguage = (): AppLanguage =>
  (i18n.resolvedLanguage ?? i18n.language ?? "en").startsWith("ja") ? "ja" : "en";

export default i18n;
