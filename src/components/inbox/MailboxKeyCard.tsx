"use client";

import React from "react";
import { KeyRound, ShieldAlert } from "lucide-react";
import { CopyField } from "../ui/CopyField";
import { Button } from "../ui/Button";
import { useLocale } from "@/hooks/useLocale";

export interface MailboxKeyCardProps {
  username: string;
  recoveryPasscode?: string;
  inboxUrl?: string;
  publicUrl?: string;
  onEnterInbox?: () => void;
  isInitialCreation?: boolean;
}

export function MailboxKeyCard({
  username,
  recoveryPasscode,
  inboxUrl,
  publicUrl,
  onEnterInbox,
  isInitialCreation = false,
}: MailboxKeyCardProps) {
  const { t } = useLocale();

  const effectivePublicUrl =
    publicUrl ||
    (typeof window !== "undefined"
      ? `${window.location.origin}/${username}`
      : `/${username}`);

  const effectiveInboxUrl =
    inboxUrl ||
    (typeof window !== "undefined"
      ? `${window.location.origin}/inbox/${username}`
      : `/inbox/${username}`);

  return (
    <div className="w-full border border-[#F0E2D2] dark:border-[#351D4D] rounded-3xl bg-[#FFFDF9] dark:bg-[#170A24] p-6 sm:p-8 space-y-6 shadow-xl relative overflow-hidden">
      <div className="absolute -top-3 right-8 w-24 h-6 washi-tape-yellow rounded-sm pointer-events-none" />

      <div className="flex items-start gap-3.5">
        <div className="w-11 h-11 rounded-2xl border border-[#FDE68A] dark:border-[#78350F] flex items-center justify-center text-[#D9534F] dark:text-[#FCA5A5] bg-[#FEF3C7] dark:bg-[#3B1B10] shrink-0 shadow-sm">
          <KeyRound size={20} strokeWidth={1.5} />
        </div>
        <div>
          <h3 className="text-xl font-serif font-bold text-[#2C1E16] dark:text-[#FFF8F0]">
            {t("keyCard.title")}
          </h3>
          <p className="text-xs text-[#7C7069] dark:text-[#A8988B] mt-0.5 leading-relaxed">
            {t("keyCard.warning")}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Passcode only shown immediately post creation */}
        {isInitialCreation && recoveryPasscode && (
          <div className="p-4 sm:p-5 rounded-2xl border border-[#FDE68A] dark:border-[#78350F] bg-[#FEF3C7]/60 dark:bg-[#2B1B0E]/60 space-y-2.5">
            <div className="flex items-center gap-2 text-xs text-[#D9534F] dark:text-[#FCA5A5] font-semibold">
              <ShieldAlert size={16} strokeWidth={1.5} />
              <span>{t("keyCard.passcodeWarning")}</span>
            </div>
            <CopyField
              value={recoveryPasscode}
              label={t("keyCard.passcodeLabel")}
              isSensitive={false}
            />
          </div>
        )}

        {/* Public letter link to share */}
        <CopyField
          value={effectivePublicUrl}
          label={t("keyCard.publicLinkLabel")}
          helperText={t("keyCard.publicLinkHelp")}
        />

        {/* Private inbox link with token */}
        {inboxUrl && (
          <CopyField
            value={effectiveInboxUrl}
            label={t("keyCard.inboxLinkLabel")}
            helperText={t("keyCard.inboxLinkHelp")}
            isSensitive={true}
          />
        )}
      </div>

      {onEnterInbox && (
        <div className="pt-2">
          <Button
            variant="primary"
            size="lg"
            className="w-full bg-[#FFE5B4] hover:bg-[#FCD34D] text-[#382A22] font-semibold border border-[#F0D59E]"
            onClick={onEnterInbox}
          >
            {t("keyCard.openInbox")}
          </Button>
        </div>
      )}
    </div>
  );
}
