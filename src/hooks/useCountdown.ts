"use client";

import { useState, useEffect } from "react";
import { getCountdownParts, formatCountdown } from "@/lib/time";
import { useLocale } from "./useLocale";

export function useCountdown(targetEpochMs: number) {
  const { locale } = useLocale();
  const [parts, setParts] = useState(() => getCountdownParts(targetEpochMs));

  useEffect(() => {
    // Initial evaluation
    setParts(getCountdownParts(targetEpochMs));

    if (Date.now() >= targetEpochMs) return;

    // 1s interval that always recomputes from targetEpochMs to withstand tab blur
    const interval = setInterval(() => {
      const current = getCountdownParts(targetEpochMs);
      setParts(current);
      if (current.isExpired) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetEpochMs]);

  const formatted = formatCountdown(targetEpochMs, locale);
  const isWarn = parts.totalSeconds > 0 && parts.totalSeconds <= 3600; // Under 1 hour
  const isDanger = parts.totalSeconds > 0 && parts.totalSeconds <= 600; // Under 10 minutes

  return {
    ...parts,
    formatted,
    isWarn,
    isDanger,
  };
}
