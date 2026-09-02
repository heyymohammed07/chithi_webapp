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
        <label className="block text-xs font-mono uppercase tracking-wider text-[#7C7069]">
          {locale === "bn" ? "হস্তাক্ষর ও ফন্ট শৈলী" : "Handwriting & Font Style"}
        </label>
        <span className="text-[11px] text-[#D9534F] font-serif italic">
          {locale === "bn" ? currentFont.nameBn : currentFont.name}
        </span>
      </div>

      <div
        role="radiogroup"
        aria-label="Handwriting font"
        className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 select-none"
      >
        {AVAILABLE_FONTS.map((key) => {
          const f = FONTS[key];
          const isSelected = selected === key || (selected === "casual" && key === "handwriting2") || (selected === "calligraphy" && key === "handwriting1") || (selected === "pencil" && key === "handwriting3");

          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange(key)}
              className={`p-3 rounded-2xl border text-left transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D9534F] flex flex-col justify-between ${
                isSelected
                  ? "bg-[#FAF7F2] border-[#D9534F] text-[#2D2522] ring-1 ring-[#D9534F] shadow-sm"
                  : "bg-[#FFFDF9] border-[#EBE3D5] text-[#7C7069] hover:text-[#2D2522] hover:border-[#D4A373]"
              }`}
            >
              <span
                className="text-lg leading-snug mb-1 truncate block"
                style={{ fontFamily: `${f.fontVar}` }}
              >
                {f.sample}
              </span>
              <span className="text-[10px] font-mono text-[#7C7069] uppercase tracking-wider block truncate">
                {locale === "bn" ? f.nameBn : f.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
