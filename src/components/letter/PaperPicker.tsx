"use client";

import React from "react";
import { PaperStyleId } from "@/lib/types";
import { PAPERS } from "@/lib/paper";
import { useLocale } from "@/hooks/useLocale";

export interface PaperPickerProps {
  selected: PaperStyleId;
  onChange: (paper: PaperStyleId) => void;
}

export function PaperPicker({ selected, onChange }: PaperPickerProps) {
  const { t } = useLocale();
  const paperKeys = Object.keys(PAPERS) as PaperStyleId[];

  return (
    <div className="space-y-2.5">
      <label className="block text-xs font-mono uppercase tracking-wider text-ink-muted">
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

          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange(key)}
              className={`group flex flex-col items-center gap-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-wax focus-visible:outline-offset-2 rounded-xl p-1 transition-all ${
                isSelected ? "scale-105" : "opacity-85 hover:opacity-100"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full transition-all shadow-sm paper-${key} ${
                  isSelected
                    ? "border-2 border-wax ring-2 ring-wax/30 shadow-md"
                    : "border-2 border-edge hover:border-wax/60"
                }`}
              />
              <span
                className={`text-[11px] transition-colors whitespace-nowrap ${
                  isSelected
                    ? "text-ink dark:text-ink-heading font-medium"
                    : "text-ink-muted"
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
