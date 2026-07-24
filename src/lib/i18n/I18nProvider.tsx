"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { dictionary, type Locale } from "./dictionary";

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType>({
  locale: "en",
  setLocale: () => {},
  t: (key: string) => key,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const stored = localStorage.getItem("rsd_locale") as Locale | null;
    if (stored === "sw" || stored === "en") setLocaleState(stored);
  }, []);

  const setLocale = useCallback((loc: Locale) => {
    setLocaleState(loc);
    localStorage.setItem("rsd_locale", loc);
  }, []);

  const t = useCallback((key: string): string => {
    return dictionary[locale][key] || key;
  }, [locale]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
