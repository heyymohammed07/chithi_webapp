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
    <div className="relative p-6 sm:p-8 rounded-3xl bg-[#FFFDF9] dark:bg-[#170A24] border border-[#F0E2D2] dark:border-[#351D4D] shadow-xl overflow-hidden transition-colors">
      {/* Whimsical Washi Tape Accent at Top Right */}
      <div className="absolute -top-3 right-8 w-24 h-6 washi-tape-lavender rotate-2 rounded-sm pointer-events-none z-10" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Monogram + Identity Details */}
        <div className="flex items-center gap-5">
          {/* Scrapbook Monogram Avatar with Postal Perforation Border */}
          <div className="relative">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#FEF3C7] dark:bg-[#2B1B10] border-2 border-dashed border-[#E88B60]/60 flex items-center justify-center text-[#E88B60] font-serif font-bold text-2xl sm:text-3xl shadow-sm rotate-[-2deg]">
              {initial}
            </div>
            {/* Tiny Postal Stamp Corner Badge */}
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#E88B60] text-white flex items-center justify-center text-[10px] shadow-sm">
              ✉
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#2C1E16] dark:text-[#FFF8F0] tracking-tight">
                @{username}
              </h1>

              {genderLabel && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-[#E8DEF8] dark:bg-[#341A52] text-[#493F60] dark:text-[#E9D8FD] border border-[#D8B4F8] dark:border-[#52336B]">
                  {genderLabel}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#D8ECD9] dark:bg-[#1C3322] text-[#2E5334] dark:text-[#A7F3D0] border border-[#A7F3D0] dark:border-[#2D5A37]">
                <span className="w-2 h-2 rounded-full bg-[#2E5334] dark:bg-[#34D399] animate-pulse" />
                <span>{t("profile.statusActive")}</span>
              </span>

              <span className="hidden sm:inline-flex items-center gap-1 text-xs text-[#7C7069] dark:text-[#A8988B]">
                <ShieldCheck size={14} className="text-[#34D399]" />
                <span>{t("profile.activeSession")}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Authoritative Live Countdown Box in Warm Buttercup Pastel */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#FEF3C7] dark:bg-[#251338] border border-[#FDE68A] dark:border-[#4A286D] flex flex-col sm:items-end justify-center shadow-sm min-w-[200px]">
          <div className="flex items-center gap-1.5 text-xs font-mono text-[#7C7069] dark:text-[#A8988B] uppercase tracking-wider mb-1">
            <Clock size={14} className="text-[#E88B60]" />
            <span>{t("profile.timeLeft")}</span>
          </div>
          <div className="text-xl sm:text-2xl font-serif font-bold text-[#2C1E16] dark:text-[#FFF8F0] tracking-tight">
            {countdown.isExpired ? (
              <span className="text-[#D9534F]">{t("profile.statusExpired")}</span>
            ) : (
              countdown.formatted
            )}
          </div>
          <div className="text-[11px] text-[#7C7069] dark:text-[#A8988B] flex items-center gap-1 mt-0.5">
            <Sparkles size={11} className="text-[#E88B60]" />
            <span>{t("profile.expiresIn")} {countdown.formatted}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
