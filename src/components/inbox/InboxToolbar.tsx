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
}

export function InboxToolbar({
  username,
  unreadCount,
  totalCount,
  acceptsBottles,
  onOpenKeys,
}: InboxToolbarProps) {
  const { locale, t } = useLocale();

  const formattedUnread =
    locale === "bn" ? toBengaliDigits(unreadCount) : unreadCount;
  const formattedTotal =
    locale === "bn" ? toBengaliDigits(totalCount) : totalCount;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 p-4 border border-[#EBE3D5] dark:border-[#351D4D] rounded-3xl bg-[#FFFDF9] dark:bg-[#170A24] shadow-[0_12px_32px_-8px_rgba(78,59,44,0.06)] dark:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5)] select-none transition-colors">
      {/* Counters */}
      <div className="flex items-center gap-4 text-xs font-mono">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#D9534F] animate-pulse" />
          <span className="font-bold text-[#2D2522] dark:text-[#FFF8F0] text-sm">
            {formattedUnread}
          </span>
          <span className="text-[#7C7069] dark:text-[#A592A4]">{t("inbox.toolbar.unread")}</span>
        </div>

        <div className="h-3 w-px bg-[#EBE3D5] dark:bg-[#351D4D]" />

        <div className="flex items-center gap-1.5">
          <span className="font-bold text-[#2D2522] dark:text-[#FFF8F0] text-sm">
            {formattedTotal}
          </span>
          <span className="text-[#7C7069] dark:text-[#A592A4]">{t("inbox.toolbar.total")}</span>
        </div>
      </div>

      {/* Actions: Bottle Toggle and Keys Modal Button */}
      <div className="flex items-center gap-4">
        <BottleToggle username={username} initialValue={acceptsBottles} />

        <Button
          variant="secondary"
          size="sm"
          onClick={onOpenKeys}
          className="gap-1.5 text-xs font-mono rounded-full border-[#EBE3D5] dark:border-[#351D4D] bg-[#FAF7F2] dark:bg-[#1E0F2E] text-[#2D2522] dark:text-[#FFF8F0] hover:bg-[#FFFDF9] dark:hover:bg-[#2B143D]"
        >
          <KeyRound size={14} strokeWidth={1.5} className="text-[#D9534F]" />
          <span>{t("inbox.toolbar.keys")}</span>
        </Button>
      </div>
    </div>
  );
}
