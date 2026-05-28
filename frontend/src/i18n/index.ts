import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import lt from "./lt.json";
import en from "./en.json";
import pagesLt from "./pages.lt.json";
import pagesEn from "./pages.en.json";

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      lt: { translation: { ...lt, pages: pagesLt } },
      en: { translation: { ...en, pages: pagesEn } },
    },
    fallbackLng: "lt",
    supportedLngs: ["lt", "en"],
    interpolation: { escapeValue: false },
    detection: {
      // Lithuanian is the default; only an explicit user choice (cached in
      // localStorage) overrides it — the browser language is intentionally ignored.
      order: ["localStorage"],
      caches: ["localStorage"],
    },
  });

export default i18n;
