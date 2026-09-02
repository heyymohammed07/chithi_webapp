"use client";

import React from "react";
import { useLocale } from "@/hooks/useLocale";

export function LocaleToggle() {
  const { locale, setLocale } = useLocale();

  return (
    <div
      role="group"
      aria-label="Language selector"
      className="inline-flex items-center text-xs font-mono tracking-wider border border-[#F0E2D2] dark:border-[#351D4D] rounded-full p-0.5 bg-[#FFF8F0] dark:bg-[#170A24] transition-colors shadow-sm"
    >
      <button
        type="button"
        aria-pressed={locale === "en"}
        onClick={() => setLocale("en")}
        className={`px-2.5 py-1 transition-all rounded-full select-none text-[11px] ${
          locale === "en"
            ? "bg-[#FFE5B4] dark:bg-[#2B143D] text-[#382A22] dark:text-[#FFF8F0] font-bold shadow-xs"
            : "text-[#857367] dark:text-[#A592A4] hover:text-[#382A22] dark:hover:text-[#FFF8F0]"
        }`}
      >
        EN
      </button>
      <div className="w-[1px] h-3 bg-[#F0E2D2] dark:bg-[#351D4D] mx-0.5" />
      <button
        type="button"
        aria-pressed={locale === "bn"}
        onClick={() => setLocale("bn")}
        className={`px-2.5 py-1 font-serif transition-all rounded-full select-none text-[11px] ${
          locale === "bn"
            ? "bg-[#FFE5B4] dark:bg-[#2B143D] text-[#382A22] dark:text-[#FFF8F0] font-bold shadow-xs"
            : "text-[#857367] dark:text-[#A592A4] hover:text-[#382A22] dark:hover:text-[#FFF8F0]"
        }`}
      >
        বাং
      </button>
    </div>
  );
}
