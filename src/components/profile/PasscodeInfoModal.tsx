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
          <div className="w-12 h-12 rounded-2xl bg-[#FEF3C7] border border-[#FDE68A] flex items-center justify-center text-[#D9534F] shadow-sm">
            <Lock size={22} strokeWidth={1.5} />
          </div>
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#7C7069] block">
              Zero-Knowledge Privacy
            </span>
            <h3 className="text-lg font-serif font-bold text-[#2D2522]">
              {t("profile.passcodeModal.title")}
            </h3>
          </div>
        </div>

        {/* Security Explanation */}
        <div className="space-y-3 text-xs sm:text-sm text-[#7C7069] leading-relaxed">
          <p>{t("profile.passcodeModal.desc")}</p>

          <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#EBE3D5] space-y-1.5 text-xs text-[#2D2522]">
            <div className="flex items-center gap-1.5 font-medium text-[#D9534F]">
              <Sparkles size={14} />
              <span>Tip</span>
            </div>
            <p className="text-[#7C7069] leading-relaxed">
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
            className="w-full rounded-full bg-[#D9534F] hover:bg-[#C2433F] text-white"
          >
            {t("profile.passcodeModal.close")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
