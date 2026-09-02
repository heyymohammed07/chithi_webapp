"use client";

import React from "react";
import { StampId } from "@/lib/types";
import { STAMPS } from "@/lib/paper";
import { Clock, HeartCrack } from "lucide-react";
import { useLocale } from "@/hooks/useLocale";

export interface StampPickerProps {
  selected: StampId;
  onChange: (stamp: StampId) => void;
}

export function StampPicker({ selected, onChange }: StampPickerProps) {
  const { t } = useLocale();
  const stampKeys = Object.keys(STAMPS) as StampId[];

  return (
    <div className="space-y-2.5">
      <label className="block text-xs font-mono uppercase tracking-wider text-[#7A6658] dark:text-[#C5B3A6]">
        {t("composer.stampLabel")}
      </label>

      <div
        role="radiogroup"
        aria-label={t("composer.stampLabel")}
        className="flex items-center gap-3.5 overflow-x-auto pb-1 select-none"
      >
        {stampKeys.map((key) => {
          const isSelected = selected === key;
          const s = STAMPS[key];

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
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm ${
                  isSelected
                    ? "border-2 border-[#E27D50] ring-2 ring-[#E27D50]/20 bg-[#FFE5B4]/40 dark:bg-[#2B143D]"
                    : "border border-[#E5D5C2] dark:border-[#3E2356] bg-white/80 dark:bg-[#1A0C28]/80 text-[#4A3B32] dark:text-[#D5C2B6] hover:border-[#E27D50]/60"
                }`}
              >
                {key === "wax" && (
                  <div className="w-6 h-6 rounded-full bg-[#E88B60] text-white font-serif italic text-xs font-bold flex items-center justify-center shadow-sm">
                    C
                  </div>
                )}
                {key === "topSecret" && (
                  <span className="text-[9px] font-accent uppercase tracking-tighter border border-current px-1 py-0.5 rounded-sm font-semibold">
                    SEC
                  </span>
                )}
                {key === "memory" && (
                  <Clock
                    size={18}
                    strokeWidth={1.5}
                    className={isSelected ? "text-[#E88B60]" : "text-[#4A3B32] dark:text-[#D5C2B6]"}
                  />
                )}
                {key === "heartbreak" && (
                  <HeartCrack
                    size={18}
                    strokeWidth={1.5}
                    className={isSelected ? "text-[#E88B60]" : "text-[#4A3B32] dark:text-[#D5C2B6]"}
                  />
                )}
              </div>
              <span
                className={`text-[11px] whitespace-nowrap transition-colors ${
                  isSelected
                    ? "text-[#2C1E16] dark:text-[#FFF8F0] font-semibold"
                    : "text-[#7A6658] dark:text-[#C5B3A6] font-medium"
                }`}
              >
                {t(s.labelKey)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
