"use client";

import React from "react";
import { useLocale } from "@/hooks/useLocale";
import { toBengaliDigits } from "@/lib/time";
import { BottleToggle } from "@/components/inbox/BottleToggle";
import { Mail, Inbox, Waves } from "lucide-react";

export interface ProfileStatsGridProps {
  username: string;
  unreadCount: number;
  totalEnvelopeCount: number;
  acceptsBottles: boolean;
}

export function ProfileStatsGrid({
  username,
  unreadCount,
  totalEnvelopeCount,
  acceptsBottles,
}: ProfileStatsGridProps) {
  const { locale, t } = useLocale();

  const formattedUnread =
    locale === "bn" ? toBengaliDigits(unreadCount) : unreadCount;
  const formattedTotal =
    locale === "bn" ? toBengaliDigits(totalEnvelopeCount) : totalEnvelopeCount;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {/* Stat 1: Unread Envelopes (Lavender) */}
      <div className="relative p-5 sm:p-6 rounded-3xl bg-[#FFFDF9] dark:bg-[#170A24] border border-[#F0E2D2] dark:border-[#351D4D] shadow-xl flex flex-col justify-between overflow-hidden transition-colors">
        <div className="absolute -top-2 left-6 w-16 h-4 washi-tape-lavender rounded-sm pointer-events-none" />

        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-[#E8DEF8] dark:bg-[#341A52] border border-[#D8B4F8] dark:border-[#52336B] flex items-center justify-center text-[#493F60] dark:text-[#E9D8FD]">
            <Mail size={20} strokeWidth={1.5} />
          </div>
          {unreadCount > 0 && (
            <span className="w-2.5 h-2.5 rounded-full bg-[#E88B60] animate-pulse mt-1" />
          )}
        </div>

        <div>
          <span className="text-3xl sm:text-4xl font-serif font-bold text-[#2C1E16] dark:text-[#FFF8F0] block tracking-tight">
            {formattedUnread}
          </span>
          <span className="text-xs sm:text-sm font-medium text-[#2C1E16] dark:text-[#FFF8F0] mt-1 block">
            {t("profile.stats.unreadTitle")}
          </span>
          <p className="text-[11px] text-[#7C7069] dark:text-[#A8988B] mt-0.5">
            {t("profile.stats.unreadDesc")}
          </p>
        </div>
      </div>

      {/* Stat 2: Total Envelopes (Sky Mist) */}
      <div className="relative p-5 sm:p-6 rounded-3xl bg-[#FFFDF9] dark:bg-[#170A24] border border-[#F0E2D2] dark:border-[#351D4D] shadow-xl flex flex-col justify-between overflow-hidden transition-colors">
        <div className="absolute -top-2 left-6 w-16 h-4 washi-tape-skymist rounded-sm pointer-events-none" />

        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-[#E0F2FE] dark:bg-[#163852] border border-[#BAE6FD] dark:border-[#225780] flex items-center justify-center text-[#1E4868] dark:text-[#BAE6FD]">
            <Inbox size={20} strokeWidth={1.5} />
          </div>
        </div>

        <div>
          <span className="text-3xl sm:text-4xl font-serif font-bold text-[#2C1E16] dark:text-[#FFF8F0] block tracking-tight">
            {formattedTotal}
          </span>
          <span className="text-xs sm:text-sm font-medium text-[#2C1E16] dark:text-[#FFF8F0] mt-1 block">
            {t("profile.stats.totalTitle")}
          </span>
          <p className="text-[11px] text-[#7C7069] dark:text-[#A8988B] mt-0.5">
            {t("profile.stats.totalDesc")}
          </p>
        </div>
      </div>

      {/* Stat 3: Accept Bottles Toggle (Sage) */}
      <div className="relative p-5 sm:p-6 rounded-3xl bg-[#FFFDF9] dark:bg-[#170A24] border border-[#F0E2D2] dark:border-[#351D4D] shadow-xl flex flex-col justify-between overflow-hidden transition-colors">
        <div className="absolute -top-2 left-6 w-16 h-4 washi-tape-sage rounded-sm pointer-events-none" />

        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-[#D8ECD9] dark:bg-[#1C3322] border border-[#A7F3D0] dark:border-[#2D5A37] flex items-center justify-center text-[#2E5334] dark:text-[#A7F3D0]">
            <Waves size={20} strokeWidth={1.5} />
          </div>
          <BottleToggle username={username} initialValue={acceptsBottles} />
        </div>

        <div>
          <span className="text-xs sm:text-sm font-medium text-[#2C1E16] dark:text-[#FFF8F0] mt-1 block">
            {t("profile.stats.bottleTitle")}
          </span>
          <p className="text-[11px] text-[#7C7069] dark:text-[#A8988B] mt-0.5 leading-relaxed">
            {t("profile.stats.bottleDesc")}
          </p>
        </div>
      </div>
    </div>
  );
}
