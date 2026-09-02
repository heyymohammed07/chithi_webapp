"use client";

import React from "react";
import { Heart, HeartCrack } from "lucide-react";
import { useLocale } from "@/hooks/useLocale";
import { toBengaliDigits } from "@/lib/time";

export interface ReactionButtonProps {
  type: "heart" | "heartCrack";
  count: number;
  hasReacted: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export function ReactionButton({
  type,
  count,
  hasReacted,
  onClick,
  disabled = false,
}: ReactionButtonProps) {
  const { locale } = useLocale();

  const formattedCount = locale === "bn" ? toBengaliDigits(count) : count;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono tracking-wider border transition-colors select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D9534F] focus-visible:outline-offset-2 ${
        hasReacted
          ? "bg-[#FEF2F2] border-[#FCA5A5] text-[#D9534F]"
          : "bg-[#FFFDF9] border-[#EBE3D5] text-[#7C7069] hover:text-[#2D2522] hover:border-[#D4A373]"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {type === "heart" ? (
        <Heart
          size={15}
          strokeWidth={1.5}
          className={hasReacted ? "fill-[#D9534F]" : ""}
        />
      ) : (
        <HeartCrack
          size={15}
          strokeWidth={1.5}
          className={hasReacted ? "fill-[#D9534F]" : ""}
        />
      )}
      <span className="font-semibold text-[11px]">{formattedCount}</span>
    </button>
  );
}
