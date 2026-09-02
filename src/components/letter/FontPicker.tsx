"use client";

import React from "react";
import { FontId } from "@/lib/types";
import { FONTS, AVAILABLE_FONTS } from "@/lib/paper";
import { useLocale } from "@/hooks/useLocale";

export interface FontPickerProps {
  selected: FontId;
  onChange: (font: FontId) => void;
}

export function FontPicker({ selected, onChange }: FontPickerProps) {
  const { locale } = useLocale();

  const currentFont = FONTS[selected] || FONTS.handwriting1;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-mono uppercase tracking-wider text-[#857367] dark:text-[#C5B3A6]">
          {locale === "bn" ? "হস্তাক্ষর ও ফন্ট শৈলী" : "Handwriting & Font Style"}
        </label>
        <span className="text-[11px] text-[#E88B60] font-serif italic">
          {locale === "bn" ? currentFont.nameBn : currentFont.name}
        </span>
      </div>

      <div
        role="radiogroup"
        aria-label="Handwriting font"
        className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5 select-none"
      >
        {AVAILABLE_FONTS.map((key) => {
          const f = FONTS[key];
          const isSelected =
            selected === key ||
            (selected === "casual" && key === "handwriting2") ||
            (selected === "calligraphy" && key === "handwriting1") ||
            (selected === "pencil" && key === "handwriting3");

          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange(key)}
              className={`p-2 sm:p-2.5 rounded-xl border text-left transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#E88B60] flex flex-col justify-between cursor-pointer ${
                isSelected
                  ? "bg-[#FFE5B4]/80 dark:bg-[#351D4D] border-[#E88B60] text-[#382A22] dark:text-[#FFF8F0] ring-1 ring-[#E88B60] shadow-xs"
                  : "bg-[#FFFDF9] dark:bg-[#170A24] border-[#F0E2D2] dark:border-[#351D4D] text-[#857367] dark:text-[#C5B3A6] hover:text-[#382A22] dark:hover:text-[#FFF8F0] hover:border-[#E88B60]/60"
              }`}
            >
              <span
                className="text-xs sm:text-sm leading-tight mb-0.5 truncate block font-medium"
                style={{ fontFamily: `${f.fontVar}` }}
              >
                {locale === "bn" ? f.sample : f.sampleEn || f.sample}
              </span>
              <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider block truncate text-[#857367] dark:text-[#A592A4]">
                {locale === "bn" ? f.nameBn : f.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
