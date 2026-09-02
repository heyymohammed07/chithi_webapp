import React from "react";
import { PaperSurface } from "./PaperSurface";
import { PaperStyleId, StampId, FontId } from "@/lib/types";

export interface LetterPreviewProps {
  body: string;
  paper: PaperStyleId;
  stamp: StampId;
  font?: FontId;
  hints?: string[];
  placeholder?: string;
  isEditable?: boolean;
  senderName?: string;
  isAnonymous?: boolean;
  onChange?: (val: string) => void;
}

export function LetterPreview({
  body,
  paper,
  stamp,
  font,
  hints = [],
  placeholder = "Write what you could never say in daylight...",
  isEditable = false,
  senderName,
  isAnonymous = true,
  onChange,
}: LetterPreviewProps) {
  const cleanHints = hints.filter((h) => h.trim().length > 0);

  return (
    <div className="w-full">
      <PaperSurface
        paper={paper}
        stamp={stamp}
        font={font}
        stampSeed="live-preview"
        variant="composer"
        isEditable={isEditable}
        value={body}
        onChange={onChange}
        placeholder={placeholder}
        className="shadow-2xl"
      >
        {body.trim() ? (
          <div className="whitespace-pre-wrap min-h-[180px] break-words">
            {body}
          </div>
        ) : (
          <div className="text-current opacity-40 italic font-serif min-h-[180px]">
            {placeholder}
          </div>
        )}

        {!isAnonymous && senderName?.trim() && (
          <div className="mt-6 pt-3 text-right font-hand text-sm opacity-90 italic">
            — {senderName.trim()}
          </div>
        )}

        {cleanHints.length > 0 && (
          <div className="mt-8 pt-4 border-t border-current/20 space-y-1 text-xs opacity-75">
            <span className="font-accent uppercase tracking-widest text-[10px] block opacity-80">
              Hints
            </span>
            {cleanHints.map((hint, i) => (
              <p key={i} className="italic">
                • {hint}
              </p>
            ))}
          </div>
        )}
      </PaperSurface>
    </div>
  );
}
