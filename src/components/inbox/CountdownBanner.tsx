"use client";

import React, { useEffect } from "react";
import { Clock } from "lucide-react";
import { useCountdown } from "@/hooks/useCountdown";
import { useLocale } from "@/hooks/useLocale";

export interface CountdownBannerProps {
  expiresAt: number; // epoch ms
  onExpired?: () => void;
}

export function CountdownBanner({ expiresAt, onExpired }: CountdownBannerProps) {
  const { t } = useLocale();
  const { formatted, isExpired, isWarn, isDanger } = useCountdown(expiresAt);

  useEffect(() => {
    if (isExpired && onExpired) {
      onExpired();
    }
  }, [isExpired, onExpired]);

  // Color state styling matching warm vintage stationery
  const bgClass = isDanger
    ? "bg-[#FEF2F2] border-[#FCA5A5] text-[#D9534F]"
    : isWarn
    ? "bg-[#FEF3C7] border-[#FDE68A] text-[#6D4E12]"
    : "bg-[#FEF3C7]/90 border-[#FDE68A] text-[#2D2522]";

  return (
    <div
      aria-live="off"
      className={`w-full px-5 py-3.5 border rounded-2xl flex flex-wrap items-center justify-between gap-3 select-none shadow-sm ${bgClass}`}
    >
      <div className="flex items-center gap-2 text-xs font-mono tracking-wider">
        <Clock size={16} strokeWidth={1.5} className="text-[#D9534F]" />
        <span className="text-[#7C7069]">{t("inbox.countdown.label")}</span>
      </div>

      <div className="font-serif font-bold text-base sm:text-lg tracking-wider">
        {formatted}
      </div>
    </div>
  );
}
