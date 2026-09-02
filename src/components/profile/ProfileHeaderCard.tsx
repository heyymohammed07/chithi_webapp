"use client";

import React from "react";
import { useCountdown } from "@/hooks/useCountdown";
import { useLocale } from "@/hooks/useLocale";
import { Clock, ShieldCheck, Sparkles } from "lucide-react";

export interface ProfileHeaderCardProps {
  username: string;
  gender: string;
  expiresAt: number;
}

export function ProfileHeaderCard({
  username,
  gender,
  expiresAt,
}: ProfileHeaderCardProps) {
  const { locale, t } = useLocale();
  const countdown = useCountdown(expiresAt);

  const initial = username.charAt(0).toUpperCase();

  // Gender label mapping
  const genderLabel =
    gender === "male"
      ? locale === "bn"
        ? "পুরুষ"
        : "Male"
      : gender === "female"
      ? locale === "bn"
        ? "নারী"
        : "Female"
      : gender === "other"
      ? locale === "bn"
        ? "অন্যান্য"
        : "Other"
      : null;

  return (
    <div className="relative p-5 sm:p-6 rounded-3xl bg-[#FFFDF9] dark:bg-[#170A24] border border-[#F0E2D2] dark:border-[#351D4D] shadow-xl overflow-hidden transition-colors">
      {/* Whimsical Washi Tape Accent at Top Right */}
      <div className="absolute -top-3 right-8 w-24 h-6 washi-tape-lavender rotate-2 rounded-sm pointer-events-none z-10" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
        {/* Monogram + Identity Details */}
        <div className="flex items-center gap-4 sm:gap-5">
          {/* Scrapbook Monogram Avatar with Postal Perforation Border */}
          <div className="relative shrink-0">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#FEF3C7] dark:bg-[#2B1B10] border-2 border-dashed border-[#E88B60]/60 flex items-center justify-center text-[#E88B60] font-serif font-bold text-xl sm:text-2xl shadow-sm rotate-[-2deg]">
              {initial}
            </div>
            {/* Tiny Postal Stamp Corner Badge */}
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#E88B60] text-white flex items-center justify-center text-[9px] shadow-sm">
              ✉
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#2C1E16] dark:text-[#FFF8F0] tracking-tight">
                @{username}
              </h1>

              {genderLabel && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[#E8DEF8] dark:bg-[#341A52] text-[#493F60] dark:text-[#E9D8FD] border border-[#D8B4F8] dark:border-[#52336B]">
                  {genderLabel}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#D8ECD9] dark:bg-[#1C3322] text-[#2E5334] dark:text-[#A7F3D0] border border-[#A7F3D0] dark:border-[#2D5A37]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2E5334] dark:bg-[#34D399] animate-pulse" />
                <span>{t("profile.statusActive")}</span>
              </span>

              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-[#7C7069] dark:text-[#A8988B]">
                <ShieldCheck size={13} className="text-[#34D399]" />
                <span>{t("profile.activeSession")}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Compact Countdown Box (1/3 visual scale, perfectly centered) */}
        <div className="flex flex-col items-center justify-center text-center px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-black/40 border border-white/10 w-auto max-w-fit mx-auto md:mx-0 self-center shadow-inner">
          <div className="flex items-center justify-center gap-1 text-[10px] sm:text-[11px] font-mono tracking-widest text-stone-400 uppercase">
            <Clock size={12} className="text-[#E88B60]" />
            <span>{t("profile.timeLeft")}</span>
          </div>
          <div className="text-base sm:text-lg font-bold tracking-wider text-amber-100/90 leading-tight my-0.5 font-serif">
            {countdown.isExpired ? (
              <span className="text-[#D9534F]">{t("profile.statusExpired")}</span>
            ) : (
              countdown.formatted
            )}
          </div>
          <div className="text-[9px] sm:text-[10px] text-stone-400 dark:text-stone-500 flex items-center justify-center gap-1">
            <Sparkles size={9} className="text-[#E88B60]" />
            <span>{t("profile.expiresIn")} {countdown.formatted}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
