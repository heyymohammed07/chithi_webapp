"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, Lock, Flame } from "lucide-react";
import { Input } from "../ui/Input";
import { Toggle } from "../ui/Toggle";
import { useLocale } from "@/hooks/useLocale";
import { formatDistanceToNow } from "date-fns";
import { bn, enUS } from "date-fns/locale";

export type LockKind = "none" | "capsule" | "riddle";

export interface AdvancedModeState {
  lockKind: LockKind;
  unlockAt: number; // epoch ms
  riddleQuestion: string;
  riddleAnswer: string;
  burnAfterReading: boolean;
}

export interface AdvancedModePanelProps {
  state: AdvancedModeState;
  onChange: (next: AdvancedModeState) => void;
  mailboxExpiresAt?: number;
}

export function AdvancedModePanel({
  state,
  onChange,
  mailboxExpiresAt,
}: AdvancedModePanelProps) {
  const { locale, t } = useLocale();
  const [isOpen, setIsOpen] = useState(false);

  const now = Date.now();
  const canCapsule =
    mailboxExpiresAt && mailboxExpiresAt > now + 60_000;

  // Clamped datetime-local limits
  const minDateStr = new Date(now + 60_000).toISOString().slice(0, 16);
  const maxDateStr = mailboxExpiresAt
    ? new Date(mailboxExpiresAt).toISOString().slice(0, 16)
    : undefined;

  const handleCapsuleChange = (isoStr: string) => {
    if (!isoStr) return;
    const epoch = new Date(isoStr).getTime();
    onChange({ ...state, unlockAt: epoch });
  };

  // Plain-language echo of capsule unlock
  let capsuleEcho = "";
  if (state.lockKind === "capsule" && state.unlockAt > now) {
    try {
      const distance = formatDistanceToNow(new Date(state.unlockAt), {
        addSuffix: true,
        locale: locale === "bn" ? bn : enUS,
      });
      capsuleEcho = `${t("composer.lockCapsuleEcho")} ${distance}`;
    } catch {
      // Ignore format error
    }
  }

  return (
    <div className="border border-[#F0E2D2] dark:border-[#351D4D] rounded-3xl bg-[#FFF8F0] dark:bg-[#170A24] overflow-hidden shadow-[0_12px_32px_-8px_rgba(70,48,32,0.08)]">
      {/* Accordion trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-4 flex items-center justify-between text-left transition-colors hover:bg-black/5 dark:hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#E88B60] focus-visible:outline-offset-2 min-h-[44px]"
      >
        <div className="flex items-center gap-2.5">
          <Lock size={18} strokeWidth={1.5} className="text-[#E88B60]" />
          <div>
            <h4 className="text-sm font-semibold text-[#2C1E16] dark:text-[#FFF8F0]">
              {t("composer.advancedTitle")}
            </h4>
            <p className="text-xs text-[#7A6658] dark:text-[#C5B3A6]">
              {t("composer.advancedSubtitle")}
            </p>
          </div>
        </div>
        <div className="text-[#7A6658] dark:text-[#C5B3A6]">
          {isOpen ? (
            <ChevronUp size={18} strokeWidth={1.5} />
          ) : (
            <ChevronDown size={18} strokeWidth={1.5} />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="px-5 pb-5 pt-2 border-t border-[#F0E2D2] dark:border-[#351D4D] space-y-6">
          {/* Radio Choice: Lock Modes (Mutually Exclusive per §11.3) */}
          <div className="space-y-3">
            <label className="block text-xs font-mono uppercase tracking-wider text-[#7A6658] dark:text-[#C5B3A6]">
              Lock Type
            </label>

            {/* Option 1: None */}
            <label className="flex items-start gap-3 cursor-pointer p-2.5 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 border border-transparent hover:border-[#F0E2D2] dark:hover:border-[#351D4D] transition-colors">
              <input
                type="radio"
                name="lockMode"
                checked={state.lockKind === "none"}
                onChange={() => onChange({ ...state, lockKind: "none" })}
                className="mt-0.5 text-[#E88B60] focus:ring-[#E88B60]"
              />
              <div>
                <span className="text-sm text-[#2C1E16] dark:text-[#FFF8F0] font-medium">
                  {t("composer.lockNone")}
                </span>
              </div>
            </label>

            {/* Option 2: Capsule */}
            {canCapsule && (
              <label className="flex items-start gap-3 cursor-pointer p-2.5 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 border border-transparent hover:border-[#F0E2D2] dark:hover:border-[#351D4D] transition-colors">
                <input
                  type="radio"
                  name="lockMode"
                  checked={state.lockKind === "capsule"}
                  onChange={() => {
                    const defaultUnlock = now + 3600_000;
                    onChange({
                      ...state,
                      lockKind: "capsule",
                      unlockAt: defaultUnlock,
                    });
                  }}
                  className="mt-0.5 text-[#E88B60] focus:ring-[#E88B60]"
                />
                <div className="flex-1">
                  <span className="text-sm text-[#2C1E16] dark:text-[#FFF8F0] font-medium">
                    {t("composer.lockCapsule")}
                  </span>
                  <p className="text-xs text-[#7A6658] dark:text-[#C5B3A6] mt-0.5">
                    {t("composer.lockCapsuleDesc")}
                  </p>

                  {state.lockKind === "capsule" && (
                    <div className="mt-3 space-y-2">
                      <input
                        type="datetime-local"
                        min={minDateStr}
                        max={maxDateStr}
                        value={
                          state.unlockAt
                            ? new Date(state.unlockAt).toISOString().slice(0, 16)
                            : ""
                        }
                        onChange={(e) => handleCapsuleChange(e.target.value)}
                        className="w-full min-h-[44px] px-3.5 py-2 text-sm bg-[#FFFDF9] dark:bg-[#12061C] text-[#2C1E16] dark:text-[#FFF8F0] rounded-xl border border-[#F0E2D2] dark:border-[#351D4D] focus:outline-none focus:border-[#E88B60]"
                      />
                      {capsuleEcho && (
                        <p className="text-xs text-[#E88B60] font-serif italic">
                          {capsuleEcho}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </label>
            )}

            {/* Option 3: Riddle */}
            <label className="flex items-start gap-3 cursor-pointer p-2.5 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 border border-transparent hover:border-[#F0E2D2] dark:hover:border-[#351D4D] transition-colors">
              <input
                type="radio"
                name="lockMode"
                checked={state.lockKind === "riddle"}
                onChange={() => onChange({ ...state, lockKind: "riddle" })}
                className="mt-0.5 text-[#E88B60] focus:ring-[#E88B60]"
              />
              <div className="flex-1">
                <span className="text-sm text-[#2C1E16] dark:text-[#FFF8F0] font-medium">
                  {t("composer.lockRiddle")}
                </span>
                <p className="text-xs text-[#7A6658] dark:text-[#C5B3A6] mt-0.5">
                  {t("composer.lockRiddleDesc")}
                </p>

                {state.lockKind === "riddle" && (
                  <div className="mt-3 space-y-3">
                    <div>
                      <label className="block text-xs text-[#7A6658] dark:text-[#C5B3A6] mb-1">
                        {t("composer.riddleQuestionLabel")}
                      </label>
                      <Input
                        maxLength={140}
                        value={state.riddleQuestion}
                        onChange={(e) =>
                          onChange({ ...state, riddleQuestion: e.target.value })
                        }
                        placeholder={t("composer.riddleQuestionPlaceholder")}
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#7A6658] dark:text-[#C5B3A6] mb-1">
                        {t("composer.riddleAnswerLabel")}
                      </label>
                      <Input
                        maxLength={60}
                        value={state.riddleAnswer}
                        onChange={(e) =>
                          onChange({ ...state, riddleAnswer: e.target.value })
                        }
                        placeholder={t("composer.riddleAnswerPlaceholder")}
                        className="text-xs"
                      />
                      <p className="text-[11px] text-[#857367] dark:text-[#A592A4] mt-1">
                        {t("composer.riddleAnswerHelp")}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </label>
          </div>

          <div className="h-px bg-[#F0E2D2] dark:bg-[#351D4D]" />

          {/* Burn After Reading Toggle (Independent switch per §11.3) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame size={16} strokeWidth={1.5} className="text-[#E27D50]" />
                <span className="text-sm font-semibold text-[#2C1E16] dark:text-[#FFF8F0]">
                  {t("composer.burnLabel")}
                </span>
              </div>
              <Toggle
                checked={state.burnAfterReading}
                onChange={(checked) =>
                  onChange({ ...state, burnAfterReading: checked })
                }
              />
            </div>
            <p className="text-xs text-[#7A6658] dark:text-[#C5B3A6]">
              {t("composer.burnDesc")}
            </p>
            {state.burnAfterReading && (
              <p className="text-[11px] text-[#D9534F] dark:text-[#F87171] font-serif italic">
                {t("composer.burnPublishNotice")}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
