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
      data-testid={`feed-reaction-${type}`}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono tracking-wider border transition-colors select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-wax focus-visible:outline-offset-2 ${
        hasReacted
          ? "bg-danger-surface border-danger-edge text-danger"
          : "bg-canvas border-edge text-ink-muted hover:text-ink hover:border-wax/50"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {type === "heart" ? (
        <Heart
          size={15}
          strokeWidth={1.5}
          className={hasReacted ? "fill-danger text-danger" : ""}
        />
      ) : (
        <HeartCrack
          size={15}
          strokeWidth={1.5}
          className={hasReacted ? "fill-danger text-danger" : ""}
        />
      )}
      <span className="font-semibold text-[11px]">{formattedCount}</span>
    </button>
  );
}
