"use client";

import React from "react";
import { countGraphemes } from "@/lib/sanitize";
import { LETTER_BODY_MAX } from "@/lib/constants";
import { useLocale } from "@/hooks/useLocale";
import { toBengaliDigits } from "@/lib/time";

export interface CharCounterProps {
  text: string;
  maxChars?: number;
}

export function CharCounter({ text, maxChars = LETTER_BODY_MAX }: CharCounterProps) {
  const { locale, t } = useLocale();
  const count = countGraphemes(text);

  // Appears at 75% of cap (§11.3)
  const threshold = Math.floor(maxChars * 0.75);
  if (count < threshold) return null;

  const isWarn = count >= Math.floor(maxChars * 0.9) && count < maxChars;
  const isWax = count >= maxChars;

  const colorClass = isWax
    ? "text-wax font-bold"
    : isWarn
    ? "text-warn font-semibold"
    : "text-ash";

  const displayCount =
    locale === "bn"
      ? `${toBengaliDigits(count)} / ${toBengaliDigits(maxChars)}`
      : `${count} / ${maxChars}`;

  return (
    <div className={`text-xs font-mono select-none ${colorClass}`}>
      <span>{displayCount}</span>{" "}
      <span className="text-[11px] text-ash-dim">{t("composer.charCount")}</span>
    </div>
  );
}
