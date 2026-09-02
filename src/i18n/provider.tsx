"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { en } from "./en";
import { bn } from "./bn";
import { Locale, TranslationKey } from "./types";
import { toBengaliDigits } from "@/lib/time";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: (key: TranslationKey | string, params?: Record<string, string | number>) => string;
}

const dictionaries = { en, bn };

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  children,
  initialLocale = "en",
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  // Sync with localStorage on client mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("chithi:locale") as Locale | null;
      if (stored && (stored === "en" || stored === "bn")) {
        setLocaleState(stored);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem("chithi:locale", next);
      document.cookie = `chithi_locale=${next}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {
      // Ignore storage errors
    }

    if (typeof document !== "undefined") {
      document.documentElement.lang = next;
      document.body.setAttribute("data-locale", next);
    }
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
      document.body.setAttribute("data-locale", locale);
    }
  }, [locale]);

  const t = useCallback(
    (path: TranslationKey | string, params?: Record<string, string | number>): string => {
      const dict = dictionaries[locale] || en;
      const fallbackDict = en;

      const keys = path.split(".");
      let val: unknown = dict;
      let fallbackVal: unknown = fallbackDict;

      for (const k of keys) {
        if (val && typeof val === "object" && k in val) {
          val = (val as Record<string, unknown>)[k];
        } else {
          val = undefined;
        }

        if (fallbackVal && typeof fallbackVal === "object" && k in fallbackVal) {
          fallbackVal = (fallbackVal as Record<string, unknown>)[k];
        } else {
          fallbackVal = undefined;
        }
      }

      let res = typeof val === "string" ? val : typeof fallbackVal === "string" ? fallbackVal : path;

      if (params) {
        for (const [pKey, pVal] of Object.entries(params)) {
          const formattedVal =
            locale === "bn" && typeof pVal === "number"
              ? toBengaliDigits(pVal)
              : String(pVal);
          res = res.replace(new RegExp(`\\{${pKey}\\}`, "g"), formattedVal);
        }
      }

      return res;
    },
    [locale]
  );

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return ctx;
}
