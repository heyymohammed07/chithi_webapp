"use client";

import React from "react";
import { Clock, KeyRound, Flame, Music } from "lucide-react";
import { LetterSummary } from "@/lib/types";
import { WaxSeal } from "./WaxSeal";
import { formatRelativeTime } from "@/lib/time";
import { useLocale } from "@/hooks/useLocale";
import { getDeterministicRotation } from "@/lib/paper";

export interface EnvelopeCardProps {
  letter: LetterSummary;
  onClick: () => void;
  isOpening?: boolean;
}

export function EnvelopeCard({ letter, onClick, isOpening = false }: EnvelopeCardProps) {
  const { locale, t } = useLocale();
  const rotation = getDeterministicRotation(letter.id);

  const isUnopened = !letter.isOpened;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Open letter from ${formatRelativeTime(letter.createdAt, locale)}`}
      className={`group relative w-full text-left p-6 sm:p-7 rounded-3xl bg-[#FFFDF9] dark:bg-[#170A24] border border-[#EBE3D5] dark:border-[#351D4D] shadow-[0_12px_32px_-8px_rgba(78,59,44,0.06)] dark:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5)] hover:shadow-md transition-all duration-200 select-none cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D9534F] focus-visible:outline-offset-2 ${
        isUnopened
          ? "border-l-4 border-l-[#D9534F]"
          : "opacity-85 hover:opacity-100"
      } ${isOpening ? "scale-95 opacity-50" : ""}`}
    >
      {/* Flap & Envelope Motif */}
      <div className="absolute top-0 left-0 right-0 h-10 border-b border-[#EBE3D5]/40 dark:border-[#351D4D]/40 pointer-events-none" />

      {/* Stamp in top-right */}
      <div
        className="absolute top-4 right-4 pointer-events-none select-none"
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        {letter.stamp === "wax" && (
          <div className="w-8 h-8 rounded-full bg-[#D9534F] text-white text-xs font-serif font-bold italic flex items-center justify-center shadow-sm">
            C
          </div>
        )}
        {letter.stamp === "topSecret" && (
          <div className="px-1.5 py-0.5 border border-[#7C7069]/40 text-[9px] font-mono uppercase text-[#7C7069] dark:text-[#A592A4]">
            CONF
          </div>
        )}
        {letter.stamp === "memory" && (
          <div className="w-7 h-7 rounded-full border border-[#D4A373] flex items-center justify-center text-[#D9534F]">
            <Clock size={14} strokeWidth={1.5} />
          </div>
        )}
        {letter.stamp === "heartbreak" && (
          <div className="w-7 h-7 rounded-full border border-[#FCA5A5] flex items-center justify-center text-[#D9534F]">
            <span className="text-xs font-mono">♥</span>
          </div>
        )}
      </div>

      {/* Centred Wax Seal on Flap */}
      <div className="flex justify-center mb-4 mt-1">
        <WaxSeal size={36} isCracked={isOpening} />
      </div>

      {/* Metadata Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-[#EBE3D5]/60 dark:border-[#351D4D]/60 text-xs text-[#7C7069] dark:text-[#A592A4]">
        <div className="flex items-center gap-2">
          {/* Attached song indicator */}
          {letter.attachedSong && (
            <span
              title={`Attached song: ${letter.attachedSong.title}`}
              className="inline-flex items-center gap-1 text-[#D9534F] font-mono text-[11px]"
            >
              <Music size={12} strokeWidth={1.5} />
              <span>Song</span>
            </span>
          )}

          {/* Lock Badges */}
          {letter.lockKind === "capsule" && (
            <span
              title="Time Capsule"
              className="inline-flex items-center gap-1 text-[#D9534F] font-mono text-[11px]"
            >
              <Clock size={12} strokeWidth={1.5} />
              <span>Capsule</span>
            </span>
          )}

          {letter.lockKind === "riddle" && (
            <span
              title="Riddle Lock"
              className="inline-flex items-center gap-1 text-[#D9534F] font-mono text-[11px]"
            >
              <KeyRound size={12} strokeWidth={1.5} />
              <span>Riddle</span>
            </span>
          )}

          {letter.burnAfterReading && (
            <span
              title="Burns after reading"
              className="inline-flex items-center gap-1 text-[#D9534F] font-mono text-[11px]"
            >
              <Flame size={12} strokeWidth={1.5} />
              <span>Burn</span>
            </span>
          )}

          {/* Has hints tag */}
          {letter.hasHints && (
            <span className="px-2 py-0.5 border border-[#FDE68A] bg-[#FEF3C7] rounded-full text-[#6D4E12] text-[10px] font-mono">
              {letter.hintCount} {t("inbox.hintsTag")}
            </span>
          )}
        </div>

        {/* Timestamp */}
        <span className="text-[#7C7069] font-serif italic text-[11px]">
          {formatRelativeTime(letter.createdAt, locale)}
        </span>
      </div>
    </button>
  );
}
