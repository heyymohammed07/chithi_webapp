"use client";

import React from "react";
import { KeyRound } from "lucide-react";
import { Button } from "../ui/Button";
import { BottleToggle } from "./BottleToggle";
import { useLocale } from "@/hooks/useLocale";
import { toBengaliDigits } from "@/lib/time";

export interface InboxToolbarProps {
  username: string;
  unreadCount: number;
  totalCount: number;
  acceptsBottles: boolean;
  onOpenKeys: () => void;
  activeFilter?: "all" | "unread";
  onFilterChange?: (filter: "all" | "unread") => void;
}

export function InboxToolbar({
  username,
  unreadCount,
  totalCount,
  acceptsBottles,
  onOpenKeys,
  activeFilter = "all",
  onFilterChange,
}: InboxToolbarProps) {
  const { locale, t } = useLocale();

  const formattedUnread =
    locale === "bn" ? toBengaliDigits(unreadCount) : unreadCount;
  const formattedTotal =
    locale === "bn" ? toBengaliDigits(totalCount) : totalCount;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 p-4 border border-[#F0E2D2] dark:border-[#351D4D] rounded-3xl bg-[#FFFDF9] dark:bg-[#170A24] shadow-[0_12px_32px_-8px_rgba(78,59,44,0.06)] dark:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5)] select-none transition-colors">
      {/* Interactive Filter Counters */}
      <div className="flex items-center gap-2 text-xs font-mono">
        <button
          type="button"
          onClick={() => onFilterChange?.("unread")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all cursor-pointer ${
            activeFilter === "unread"
              ? "bg-[#FFE5B4] text-[#382A22] font-bold border border-[#FCD34D] shadow-xs"
              : "text-[#7C7069] dark:text-[#A592A4] hover:text-[#2D2522] dark:hover:text-[#FFF8F0] hover:bg-black/5 dark:hover:bg-white/5"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-[#E88B60] animate-pulse" />
          <span className="font-bold text-sm">{formattedUnread}</span>
          <span>{t("inbox.toolbar.unread")}</span>
        </button>

        <div className="h-4 w-px bg-[#F0E2D2] dark:bg-[#351D4D]" />

        <button
          type="button"
          onClick={() => onFilterChange?.("all")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all cursor-pointer ${
            activeFilter === "all"
              ? "bg-[#FFE5B4] text-[#382A22] font-bold border border-[#FCD34D] shadow-xs"
              : "text-[#7C7069] dark:text-[#A592A4] hover:text-[#2D2522] dark:hover:text-[#FFF8F0] hover:bg-black/5 dark:hover:bg-white/5"
          }`}
        >
          <span className="font-bold text-sm">{formattedTotal}</span>
          <span>{t("inbox.toolbar.total")}</span>
        </button>
      </div>

      {/* Actions: Bottle Toggle and Keys Modal Button */}
      <div className="flex items-center gap-3 sm:gap-4">
        <BottleToggle username={username} initialValue={acceptsBottles} />

        <Button
          variant="secondary"
          size="sm"
          onClick={onOpenKeys}
          className="gap-1.5 text-xs font-mono rounded-full border-[#F0E2D2] dark:border-[#351D4D] bg-[#FAF7F2] dark:bg-[#1E0F2E] text-[#2D2522] dark:text-[#FFF8F0] hover:bg-[#FFFDF9] dark:hover:bg-[#2B143D] cursor-pointer"
        >
          <KeyRound size={14} strokeWidth={1.5} className="text-[#E88B60]" />
          <span>{t("inbox.toolbar.keys")}</span>
        </Button>
      </div>
    </div>
  );
}
