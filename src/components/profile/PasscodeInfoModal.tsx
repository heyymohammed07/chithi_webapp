"use client";

import React from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/hooks/useLocale";
import { Lock, Sparkles } from "lucide-react";

export interface PasscodeInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PasscodeInfoModal({ isOpen, onClose }: PasscodeInfoModalProps) {
  const { t } = useLocale();

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
      <div className="space-y-5 text-left p-1">
        {/* Postal Scrapbook Header Motif */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-peach/50 border border-edge flex items-center justify-center text-wax shadow-sm">
            <Lock size={22} strokeWidth={1.5} />
          </div>
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-ink-muted block">
              Zero-Knowledge Privacy
            </span>
            <h3 className="text-lg font-serif font-bold text-ink">
              {t("profile.passcodeModal.title")}
            </h3>
          </div>
        </div>

        {/* Security Explanation */}
        <div className="space-y-3 text-xs sm:text-sm text-ink-muted leading-relaxed">
          <p>{t("profile.passcodeModal.desc")}</p>

          <div className="p-3.5 rounded-2xl bg-surface border border-edge space-y-1.5 text-xs text-ink">
            <div className="flex items-center gap-1.5 font-medium text-wax">
              <Sparkles size={14} />
              <span>Tip</span>
            </div>
            <p className="text-ink-muted leading-relaxed">
              {t("profile.passcodeModal.tip")}
            </p>
          </div>
        </div>

        {/* Action button */}
        <div className="pt-2">
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={onClose}
            className="w-full rounded-full"
          >
            {t("profile.passcodeModal.close")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
