"use client";

import React, { useState } from "react";
import { Clock, KeyRound, AlertTriangle } from "lucide-react";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { useCountdown } from "@/hooks/useCountdown";
import { useLocale } from "@/hooks/useLocale";
import { useReducedMotionSafe } from "@/hooks/useReducedMotionSafe";
import { toBengaliDigits } from "@/lib/time";

export interface LockedLetterGateProps {
  letterId: string;
  lockKind: "capsule" | "riddle";
  unlockAt?: number;
  riddleQuestion?: string;
  attemptsRemaining?: number;
  onUnlocked: (body: string) => void;
  username: string;
}

export function LockedLetterGate({
  letterId,
  lockKind,
  unlockAt = 0,
  riddleQuestion = "",
  attemptsRemaining = 5,
  onUnlocked,
  username,
}: LockedLetterGateProps) {
  const { locale, t } = useLocale();
  const shouldReduceMotion = useReducedMotionSafe();
  const countdown = useCountdown(unlockAt);

  const [answer, setAnswer] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState(attemptsRemaining);

  const handleRiddleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim()) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/letters/${letterId}/unlock?username=${encodeURIComponent(username)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: answer.trim() }),
      });

      const json = await res.json();

      if (json.ok) {
        onUnlocked(json.data.body);
      } else {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);

        if (json.error?.details?.attemptsRemaining?.[0]) {
          setAttemptsLeft(Number(json.error.details.attemptsRemaining[0]));
        } else {
          setAttemptsLeft((prev) => Math.max(0, prev - 1));
        }

        setErrorMsg(t(json.error?.message || "errors.riddleWrongAnswer"));
      }
    } catch {
      setErrorMsg(t("errors.generic"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (lockKind === "capsule") {
    return (
      <div className="flex flex-col items-center text-center p-6 sm:p-10 border border-[#EBE3D5] rounded-3xl bg-[#FFFDF9] shadow-[0_12px_32px_-8px_rgba(78,59,44,0.06)] max-w-md mx-auto space-y-4">
        <div className="w-12 h-12 rounded-2xl border border-[#FDE68A] flex items-center justify-center text-[#D9534F] bg-[#FEF3C7]">
          <Clock size={24} strokeWidth={1.5} />
        </div>

        <div>
          <h3 className="text-lg font-serif font-semibold text-[#2D2522]">
            {t("gate.capsuleTitle")}
          </h3>
          <p className="text-xs text-[#7C7069] mt-1">
            {t("gate.capsuleDesc")}
          </p>
        </div>

        <div className="p-4 rounded-2xl border border-[#FDE68A] bg-[#FEF3C7]/80 w-full space-y-1">
          <span className="text-xs font-mono uppercase text-[#7C7069] block">
            {t("gate.capsuleTimeLeft")}
          </span>
          <span className="text-2xl font-serif font-bold text-[#2D2522] tracking-wide">
            {countdown.formatted}
          </span>
        </div>
      </div>
    );
  }

  // Riddle Lock UI
  const isExceeded = attemptsLeft <= 0;

  return (
    <div
      className={`flex flex-col items-center text-center p-6 sm:p-10 border border-[#EBE3D5] rounded-3xl bg-[#FFFDF9] shadow-[0_12px_32px_-8px_rgba(78,59,44,0.06)] max-w-md mx-auto space-y-5 transition-transform ${
        isShaking
          ? shouldReduceMotion
            ? "opacity-50"
            : "animate-shake"
          : ""
      }`}
    >
      <div className="w-12 h-12 rounded-2xl border border-[#FDE68A] flex items-center justify-center text-[#D9534F] bg-[#FEF3C7]">
        <KeyRound size={24} strokeWidth={1.5} />
      </div>

      <div>
        <h3 className="text-lg font-serif font-semibold text-[#2D2522]">
          {isExceeded ? t("gate.riddleExceededTitle") : t("gate.riddleTitle")}
        </h3>
        <p className="text-xs text-[#7C7069] mt-1">
          {isExceeded ? t("gate.riddleExceededDesc") : t("gate.riddleDesc")}
        </p>
      </div>

      {!isExceeded && (
        <form onSubmit={handleRiddleSubmit} className="w-full space-y-4 text-left">
          {/* Riddle Question Display */}
          <div className="p-4 rounded-2xl border border-[#EBE3D5] bg-[#FAF7F2]">
            <span className="text-[11px] font-mono uppercase text-[#D9534F] block mb-1">
              Riddle Question
            </span>
            <p className="text-sm font-serif italic text-[#2D2522]">
              &ldquo;{riddleQuestion}&rdquo;
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="text-[#7C7069] font-medium">Your Answer</label>
              <span className="text-[11px] text-[#7C7069] font-mono">
                {t("gate.riddleAttemptsLeft")}{" "}
                <span className="font-bold text-[#2D2522]">
                  {locale === "bn" ? toBengaliDigits(attemptsLeft) : attemptsLeft}
                </span>
              </span>
            </div>

            <Input
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder={t("gate.answerPlaceholder")}
              maxLength={60}
              required
              error={Boolean(errorMsg)}
            />
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 text-xs text-[#D9534F] bg-[#FEF2F2] p-3 rounded-2xl border border-[#FCA5A5]">
              <AlertTriangle size={14} strokeWidth={1.5} />
              <span>{errorMsg}</span>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            className="w-full rounded-full"
            isLoading={isSubmitting}
          >
            {t("gate.unlockButton")}
          </Button>
        </form>
      )}
    </div>
  );
}
