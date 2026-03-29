import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import commonEN from "./locales/en/common.json";
import authEN from "./locales/en/auth.json";
import dashboardEN from "./locales/en/dashboard.json";
import songsEN from "./locales/en/songs.json";
import artistsEN from "./locales/en/artists.json";
import reviewsEN from "./locales/en/reviews.json";
import profileEN from "./locales/en/profile.json";

import commonJA from "./locales/ja/common.json";
import authJA from "./locales/ja/auth.json";
import dashboardJA from "./locales/ja/dashboard.json";
import songsJA from "./locales/ja/songs.json";
import artistsJA from "./locales/ja/artists.json";
import reviewsJA from "./locales/ja/reviews.json";
import profileJA from "./locales/ja/profile.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: commonEN,
        auth: authEN,
        dashboard: dashboardEN,
        songs: songsEN,
        artists: artistsEN,
        reviews: reviewsEN,
        profile: profileEN,
      },
      ja: {
        common: commonJA,
        auth: authJA,
        dashboard: dashboardJA,
        songs: songsJA,
        artists: artistsJA,
        reviews: reviewsJA,
        profile: profileJA,
      },
    },
    fallbackLng: "en",
    defaultNS: "common",
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
  });

export default i18n;
