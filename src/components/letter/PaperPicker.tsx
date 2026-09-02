"use client";

import React from "react";
import { PaperStyleId } from "@/lib/types";
import { PAPERS } from "@/lib/paper";
import { useLocale } from "@/hooks/useLocale";

export interface PaperPickerProps {
  selected: PaperStyleId;
  onChange: (paper: PaperStyleId) => void;
}

const PAPER_SWATCHES: Record<PaperStyleId, string> = {
  parchment: "bg-[#F5ECD8]",
  midnight: "bg-[#1A1722]",
  rose: "bg-[#F8EBEA]",
  typewriter: "bg-[#F3EBD9]",
  rainy: "bg-[#202730]",
};

export function PaperPicker({ selected, onChange }: PaperPickerProps) {
  const { t } = useLocale();
  const paperKeys = Object.keys(PAPERS) as PaperStyleId[];

  return (
    <div className="space-y-2.5">
      <label className="block text-xs font-mono uppercase tracking-wider text-[#7A6658] dark:text-[#C5B3A6]">
        {t("composer.paperLabel")}
      </label>

      <div
        role="radiogroup"
        aria-label={t("composer.paperLabel")}
        className="flex items-center gap-3.5 overflow-x-auto pb-1 select-none"
      >
        {paperKeys.map((key) => {
          const p = PAPERS[key];
          const isSelected = selected === key;
          const swatchBg = PAPER_SWATCHES[key] || "bg-[#F5ECD8]";

          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange(key)}
              className={`group flex flex-col items-center gap-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#E27D50] focus-visible:outline-offset-2 rounded-xl p-1 transition-all ${
                isSelected ? "scale-105" : "opacity-85 hover:opacity-100"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full transition-all shadow-sm ${swatchBg} ${
                  isSelected
                    ? "border-2 border-[#E27D50] ring-2 ring-[#E27D50]/30 shadow-md"
                    : "border-2 border-[#E5D5C2] dark:border-[#3E2356] hover:border-[#E27D50]/60"
                }`}
              />
              <span
                className={`text-[11px] transition-colors whitespace-nowrap ${
                  isSelected
                    ? "text-[#2C1E16] dark:text-[#FFF8F0] font-medium"
                    : "text-[#7A6658] dark:text-[#C5B3A6]"
                }`}
              >
                {t(p.labelKey)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
