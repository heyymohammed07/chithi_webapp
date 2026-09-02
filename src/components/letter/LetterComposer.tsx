/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PaperPicker } from "./PaperPicker";
import { StampPicker } from "./StampPicker";
import { FontPicker } from "./FontPicker";
import { HintFields } from "./HintFields";
import { AdvancedModePanel, AdvancedModeState } from "./AdvancedModePanel";
import { LetterPreview } from "./LetterPreview";
import { CharCounter } from "./CharCounter";
import { SongAttachmentModal } from "./SongAttachmentModal";
import { Button } from "../ui/Button";
import { PaperStyleId, StampId, FontId } from "@/lib/types";
import { AttachedSong } from "@/lib/music";
import { LETTER_BODY_MAX } from "@/lib/constants";
import { useToast } from "@/hooks/useToast";
import { useLocale } from "@/hooks/useLocale";
import { Music, X, User, EyeOff, Mailbox } from "lucide-react";

export interface LetterComposerProps {
  recipientUsername?: string;
  isBottleMode?: boolean;
  mailboxExpiresAt?: number;
}

function AttachedSongThumbnail({ src, alt }: { src: string; alt: string }) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <div className="w-full h-full flex items-center justify-center text-[#E88B60] bg-[#FFE5B4]/50">
        <Music size={14} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setError(true)}
      className="w-full h-full object-cover"
    />
  );
}

export function LetterComposer({
  recipientUsername,
  isBottleMode = false,
  mailboxExpiresAt,
}: LetterComposerProps) {
  const router = useRouter();
  const { locale, t } = useLocale();
  const { showToast } = useToast();

  const [paper, setPaper] = useState<PaperStyleId>("parchment");
  const [stamp, setStamp] = useState<StampId>("wax");
  const [font, setFont] = useState<FontId>("handwriting1");
  const [body, setBody] = useState("");
  const [hints, setHints] = useState<string[]>([""]);
  const [bottleTarget, setBottleTarget] = useState<"anyone" | "male" | "female">("anyone");
  const [attachedSong, setAttachedSong] = useState<AttachedSong | null>(null);
  const [isMusicModalOpen, setIsMusicModalOpen] = useState(false);

  const [advancedState, setAdvancedState] = useState<AdvancedModeState>({
    lockKind: "none",
    unlockAt: Date.now() + 3600_000,
    riddleQuestion: "",
    riddleAnswer: "",
    burnAfterReading: false,
  });

  const [isAnonymous, setIsAnonymous] = useState(true);
  const [senderName, setSenderName] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isSelfSending, setIsSelfSending] = useState(false);

  // Self-letter detection guard (§3.1)
  useEffect(() => {
    if (typeof window === "undefined" || !recipientUsername || isBottleMode) return;
    const recipientLower = recipientUsername.toLowerCase();

    // Check localStorage keys for active session
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("chithi:token:")) {
        const u = key.replace("chithi:token:", "").trim().toLowerCase();
        if (u === recipientLower) {
          setIsSelfSending(true);
          return;
        }
      }
    }

    // Check cookies
    if (typeof document !== "undefined") {
      const cookiePattern = new RegExp(`(^|;\\s*)chithi_s_${recipientLower}=`);
      if (cookiePattern.test(document.cookie)) {
        setIsSelfSending(true);
        return;
      }
    }
  }, [recipientUsername, isBottleMode]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!body.trim()) {
      showToast(t("errors.validation.bodyTooShort"), "warn");
      return;
    }

    if (body.length > LETTER_BODY_MAX) {
      showToast(t("errors.validation.bodyTooLong"), "warn");
      return;
    }

    if (!isAnonymous && !senderName.trim()) {
      showToast(
        locale === "bn"
          ? "অনুগ্রহ করে আপনার নাম লিখুন অথবা বেনামী নির্বাচন করুন"
          : "Please enter your name or choose anonymous",
        "warn"
      );
      return;
    }

    setIsSending(true);

    try {
      const cleanHints = hints.map((h) => h.trim()).filter((h) => h.length > 0);

      if (isBottleMode) {
        // Send Message in a Bottle
        const res = await fetch("/api/bottle/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            body,
            paper,
            stamp,
            hints: cleanHints,
            target: bottleTarget,
            attachedSong: attachedSong || undefined,
            senderName: isAnonymous ? null : (senderName.trim() || null),
            isAnonymous,
          }),
        });

        const json = await res.json();
        if (!json.ok) {
          showToast(t(json.error?.message || "errors.generic"), "error");
          setIsSending(false);
          return;
        }

        router.push("/bottle?sent=true");
      } else {
        // Direct Letter
        let modePayload: { kind: "none" } | { kind: "capsule"; unlockAt: number } | { kind: "riddle"; question: string; answer: string } = { kind: "none" };

        if (advancedState.lockKind === "capsule") {
          modePayload = {
            kind: "capsule",
            unlockAt: advancedState.unlockAt,
          };
        } else if (advancedState.lockKind === "riddle") {
          if (!advancedState.riddleQuestion.trim() || !advancedState.riddleAnswer.trim()) {
            showToast(t("errors.validation.failed"), "warn");
            setIsSending(false);
            return;
          }
          modePayload = {
            kind: "riddle",
            question: advancedState.riddleQuestion.trim(),
            answer: advancedState.riddleAnswer.trim(),
          };
        }

        let senderUsernameHeader: string | undefined;
        if (typeof window !== "undefined") {
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith("chithi:token:")) {
              senderUsernameHeader = k.replace("chithi:token:", "").trim();
              break;
            }
          }
        }

        const res = await fetch("/api/letters/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(senderUsernameHeader ? { "x-sender-username": senderUsernameHeader } : {}),
          },
          body: JSON.stringify({
            recipient: recipientUsername,
            body,
            paper,
            stamp,
            hints: cleanHints,
            burnAfterReading: advancedState.burnAfterReading,
            attachedSong: attachedSong || undefined,
            senderName: isAnonymous ? null : (senderName.trim() || null),
            isAnonymous,
            mode: modePayload,
          }),
        });

        const json = await res.json();
        if (!json.ok) {
          showToast(t(json.error?.message || "errors.generic"), "error");
          setIsSending(false);
          return;
        }

        // Redirect to clean root sent confirmation screen
        router.push(`/${recipientUsername}/sent`);
      }
    } catch {
      showToast(t("errors.generic"), "error");
      setIsSending(false);
    }
  };

  if (isSelfSending && recipientUsername) {
    return (
      <div className="max-w-xl mx-auto p-8 sm:p-10 rounded-3xl bg-[#FFFDF9] dark:bg-[#170A24] border border-[#F0E2D2] dark:border-[#351D4D] shadow-xl text-center space-y-5">
        <div className="w-16 h-16 rounded-full bg-[#FFE5B4]/60 dark:bg-[#2B143D] text-[#E88B60] flex items-center justify-center mx-auto shadow-inner">
          <Mailbox size={32} />
        </div>
        <div className="space-y-2">
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#2C1E16] dark:text-[#FFF8F0]">
            {locale === "bn" ? "এটি আপনার নিজের ইনবক্স!" : "This is your own mailbox desk!"}
          </h2>
          <p className="text-sm text-[#7C7069] dark:text-[#A8988B] leading-relaxed max-w-md mx-auto">
            {locale === "bn"
              ? "আপনি নিজেকে বেনামী চিঠি পাঠাতে পারবেন না। আপনার লিংকটি বন্ধুদের সাথে শেয়ার করুন অথবা নিজের আসা চিঠিগুলো পড়ুন।"
              : "You cannot send a secret letter to yourself. Share your link with friends or check your incoming letters."}
          </p>
        </div>
        <div className="pt-2">
          <Link
            href={`/inbox/${recipientUsername}`}
            className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-[#FFE5B4] hover:bg-[#FCD34D] text-[#382A22] font-semibold border border-[#F0D59E] shadow-sm transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
          >
            <span>📬 {locale === "bn" ? "আমার ইনবক্স খুলুন" : "Open My Inbox"}</span>
          </Link>
        </div>
      </div>
    );
  }

  const placeholderText =
    locale === "bn"
      ? "এখানে আপনার মনের না বলা কথাগুলো লিখুন..."
      : "Write what you could never say in daylight...";

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left Column: Direct-on-Paper Interactive Canvas */}
        <div className="lg:col-span-7 lg:sticky lg:top-24 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-mono uppercase tracking-wider text-[#857367] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#E88B60] animate-pulse" />
              {locale === "bn" ? "চিঠির কাগজ (সরাসরি লিখুন)" : "Writing Paper (Type directly)"}
            </span>
            <CharCounter text={body} maxChars={LETTER_BODY_MAX} />
          </div>

          <LetterPreview
            body={body}
            paper={paper}
            stamp={stamp}
            font={font}
            hints={hints}
            placeholder={placeholderText}
            isEditable={true}
            senderName={senderName}
            isAnonymous={isAnonymous}
            onChange={setBody}
          />

          <div className="flex items-center justify-between px-1 text-[11px] text-[#857367] italic">
            <span>{t("composer.urlWarning")}</span>
            <span>{body.length > 0 ? `${body.length} / ${LETTER_BODY_MAX}` : ""}</span>
          </div>
        </div>

        {/* Right Column: Controls & Stationery Options */}
        <div className="lg:col-span-5 space-y-6">
          {/* Target for Bottle mode */}
          {isBottleMode && (
            <div className="space-y-2 p-5 border border-[#F0E2D2] dark:border-[#351D4D] rounded-3xl bg-[#FFF8F0] dark:bg-[#170A24] shadow-[0_12px_32px_-8px_rgba(70,48,32,0.08)] dark:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5)]">
              <label className="block text-xs font-mono uppercase tracking-wider text-[#857367] dark:text-[#C5B3A6]">
                {t("bottle.targetLabel")}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["anyone", "male", "female"] as const).map((tgt) => (
                  <button
                    key={tgt}
                    type="button"
                    onClick={() => setBottleTarget(tgt)}
                    className={`py-2 px-3 text-xs font-medium rounded-xl border transition-all ${
                      bottleTarget === tgt
                        ? "bg-[#FFE5B4] border-[#FCD34D] text-[#382A22] ring-1 ring-[#FCD34D] font-bold"
                        : "bg-[#FFF8F0] dark:bg-[#1E0F2E] border-[#F0E2D2] dark:border-[#351D4D] text-[#857367] dark:text-[#C5B3A6] hover:text-[#382A22] dark:hover:text-[#FFF8F0]"
                    }`}
                  >
                    {tgt === "anyone" && t("bottle.targetAnyone")}
                    {tgt === "male" && t("bottle.targetMale")}
                    {tgt === "female" && t("bottle.targetFemale")}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-[#857367] dark:text-[#C5B3A6]">
                {t("bottle.targetNote")}
              </p>
            </div>
          )}

          {/* Section 20: Song Attachment Control */}
          <div className="p-5 border border-[#F0E2D2] dark:border-[#351D4D] rounded-3xl bg-[#FFF8F0] dark:bg-[#170A24] shadow-[0_12px_32px_-8px_rgba(70,48,32,0.08)] dark:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5)] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Music size={16} className="text-[#E88B60]" />
                <span className="text-xs font-serif font-bold text-[#382A22] dark:text-[#FFF8F0]">
                  {locale === "bn" ? "চিঠির গান (ঐচ্ছিক)" : "Background Song (Optional)"}
                </span>
              </div>
              <span className="text-[10px] font-mono text-[#857367] dark:text-[#C5B3A6] uppercase tracking-wider">
                {locale === "bn" ? "অ্যাকোস্টিক" : "Acoustic"}
              </span>
            </div>

            {attachedSong ? (
              <div className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-[#FFE5B4]/80 dark:bg-[#2B143D] border border-[#FCD34D] dark:border-[#52336B]">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative w-9 h-9 rounded-xl overflow-hidden bg-[#FFF8F0] shrink-0 border border-[#FCD34D]">
                    <AttachedSongThumbnail src={attachedSong.thumbnail} alt={attachedSong.title} />
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-xs font-serif font-bold text-[#382A22] dark:text-[#FFF8F0] truncate">
                      {attachedSong.title}
                    </h5>
                    <p className="text-[10px] text-[#857367] dark:text-[#C5B3A6] truncate">
                      {attachedSong.artist}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAttachedSong(null)}
                  className="w-7 h-7 rounded-full hover:bg-white/60 dark:hover:bg-white/10 text-[#857367] dark:text-[#C5B3A6] hover:text-[#E88B60] flex items-center justify-center transition-colors shrink-0"
                  aria-label="Remove Song"
                >
                  <X size={15} />
                </button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsMusicModalOpen(true)}
                className="w-full rounded-full border-[#F0E2D2] dark:border-[#351D4D] text-[#382A22] dark:text-[#FFF8F0] hover:bg-[#FFF8F0] dark:hover:bg-[#1E0F2E] gap-2 text-xs"
              >
                <Music size={14} className="text-[#E88B60]" />
                <span>{locale === "bn" ? "🎵 একটি গান যুক্ত করুন" : "🎵 Attach a Song"}</span>
              </Button>
            )}
          </div>

          {/* Paper, Font, and Stamp Selectors */}
          <div className="space-y-6 p-6 border border-[#F0E2D2] dark:border-[#351D4D] rounded-3xl bg-[#FFF8F0] dark:bg-[#170A24] shadow-[0_12px_32px_-8px_rgba(70,48,32,0.08)] dark:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5)]">
            <PaperPicker selected={paper} onChange={setPaper} />
            <div className="h-px bg-[#F0E2D2] dark:bg-[#351D4D]" />
            <FontPicker selected={font} onChange={setFont} />
            <div className="h-px bg-[#F0E2D2] dark:bg-[#351D4D]" />
            <StampPicker selected={stamp} onChange={setStamp} />
          </div>

          {/* Hints Field */}
          <div className="p-6 border border-[#F0E2D2] dark:border-[#351D4D] rounded-3xl bg-[#FFF8F0] dark:bg-[#170A24] shadow-[0_12px_32px_-8px_rgba(70,48,32,0.08)] dark:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5)]">
            <HintFields hints={hints} onChange={setHints} />
          </div>

          {/* Sender Identity Section (Anonymous vs Named) */}
          <div className="p-5 border border-[#F0E2D2] dark:border-[#351D4D] rounded-3xl bg-[#FFF8F0] dark:bg-[#170A24] shadow-[0_12px_32px_-8px_rgba(70,48,32,0.08)] dark:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5)] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User size={16} className="text-[#E88B60]" />
                <span className="text-xs font-serif font-bold text-[#382A22] dark:text-[#FFF8F0]">
                  {locale === "bn" ? "প্রেরকের পরিচয়" : "Sender Identity"}
                </span>
              </div>
              <span className="text-[10px] font-mono text-[#857367] dark:text-[#C5B3A6] uppercase tracking-wider">
                {isAnonymous ? (locale === "bn" ? "বেনামী" : "Anonymous") : (locale === "bn" ? "নামযুক্ত" : "Named")}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsAnonymous(true)}
                className={`py-2 px-3 text-xs font-medium rounded-xl border transition-all flex items-center justify-center gap-1.5 ${
                  isAnonymous
                    ? "bg-[#FFE5B4] border-[#FCD34D] text-[#382A22] ring-1 ring-[#FCD34D] font-bold shadow-xs"
                    : "bg-[#FFFDF9] dark:bg-[#1E0F2E] border-[#F0E2D2] dark:border-[#351D4D] text-[#857367] dark:text-[#C5B3A6] hover:text-[#382A22] dark:hover:text-[#FFF8F0]"
                }`}
              >
                <EyeOff size={13} />
                <span>{locale === "bn" ? "বেনামী (গোপন)" : "Anonymous"}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAnonymous(false)}
                className={`py-2 px-3 text-xs font-medium rounded-xl border transition-all flex items-center justify-center gap-1.5 ${
                  !isAnonymous
                    ? "bg-[#FFE5B4] border-[#FCD34D] text-[#382A22] ring-1 ring-[#FCD34D] font-bold shadow-xs"
                    : "bg-[#FFFDF9] dark:bg-[#1E0F2E] border-[#F0E2D2] dark:border-[#351D4D] text-[#857367] dark:text-[#C5B3A6] hover:text-[#382A22] dark:hover:text-[#FFF8F0]"
                }`}
              >
                <User size={13} />
                <span>{locale === "bn" ? "নাম প্রকাশ করুন" : "Show My Name"}</span>
              </button>
            </div>

            {!isAnonymous && (
              <div className="space-y-1.5 pt-1">
                <label className="block text-[11px] font-medium text-[#382A22] dark:text-[#FFF8F0]">
                  {locale === "bn" ? "আপনার নাম (চিঠির নিচে প্রদর্শিত হবে)" : "Your Name (Signed on the letter)"}
                </label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  maxLength={50}
                  placeholder={locale === "bn" ? "যেমন: রহিম আহমেদ" : "e.g. Rahim Ahmed"}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#FFFDF9] dark:bg-[#12061C] border border-[#F0E2D2] dark:border-[#351D4D] text-[#382A22] dark:text-[#FFF8F0] placeholder:text-[#857367]/60 dark:placeholder:text-[#A592A4]/60 focus:outline-none focus:ring-1 focus:ring-[#FCD34D] focus:border-[#FCD34D] transition-colors"
                />
              </div>
            )}

            <p className="text-[11px] text-[#857367] dark:text-[#C5B3A6] leading-relaxed">
              {isAnonymous
                ? (locale === "bn"
                    ? "চিঠির প্রাপক আপনার নাম দেখতে পাবেন না।"
                    : "The recipient will not see who sent this letter.")
                : (locale === "bn"
                    ? "চিঠির নিচে আপনার নাম স্পষ্টভাবে প্রাপক দেখতে পাবেন।"
                    : "Your name will be clearly visible to the recipient.")}
            </p>
          </div>

          {/* Advanced Mode Panel (Direct letters only) */}
          {!isBottleMode && (
            <AdvancedModePanel
              state={advancedState}
              onChange={setAdvancedState}
              mailboxExpiresAt={mailboxExpiresAt}
            />
          )}

          {/* Desktop Submit Button */}
          <div className="hidden lg:block pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full text-base py-3.5 rounded-full"
              isLoading={isSending}
            >
              {isBottleMode ? t("bottle.sendButton") : t("composer.sendButton")}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Bottom Action Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-[#FFF8F0]/95 dark:bg-[#0C0314]/95 border-t border-[#F0E2D2] dark:border-[#351D4D] backdrop-blur-md z-30 shadow-md">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full text-base py-3 rounded-full"
          isLoading={isSending}
        >
          {isBottleMode ? t("bottle.sendButton") : t("composer.sendButton")}
        </Button>
      </div>

      {/* Song Attachment Search Modal */}
      <SongAttachmentModal
        isOpen={isMusicModalOpen}
        onClose={() => setIsMusicModalOpen(false)}
        onSelectSong={setAttachedSong}
        currentSong={attachedSong}
      />
    </form>
  );
}
