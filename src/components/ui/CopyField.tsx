"use client";

import React, { useState } from "react";
import { Copy, Check } from "lucide-react";
import { IconButton } from "./IconButton";
import { useToast } from "@/hooks/useToast";
import { useLocale } from "@/hooks/useLocale";

export interface CopyFieldProps {
  value: string;
  label?: string;
  helperText?: string;
  isSensitive?: boolean;
}

export function CopyField({
  value,
  label,
  helperText,
  isSensitive = false,
}: CopyFieldProps) {
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();
  const { t } = useLocale();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      showToast(t("keyCard.copied"), "success");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback copy using textarea
      const el = document.createElement("textarea");
      el.value = value;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      showToast(t("keyCard.copied"), "success");
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label className="block text-xs font-mono uppercase tracking-wider text-[#7C7069] dark:text-[#A8988B]">
          {label}
        </label>
      )}
      <div className="relative flex items-center bg-white dark:bg-[#251338] border border-[#F0E2D2] dark:border-[#4A286D] rounded-xl overflow-hidden hover:border-[#D4A373] dark:hover:border-[#E88B60] transition-colors shadow-sm">
        <input
          readOnly
          value={value}
          type={isSensitive ? "password" : "text"}
          className="w-full min-h-[44px] px-3.5 text-sm bg-transparent text-[#2C1E16] dark:text-[#FFF8F0] font-mono focus:outline-none select-all"
        />
        <div className="pr-1.5">
          <IconButton
            size="sm"
            variant="ghost"
            label={copied ? "Copied" : "Copy"}
            onClick={handleCopy}
            className="text-[#7C7069] dark:text-[#A8988B] hover:text-[#2C1E16] dark:hover:text-[#FFF8F0]"
          >
            {copied ? (
              <Check size={16} className="text-[#34D399]" />
            ) : (
              <Copy size={16} />
            )}
          </IconButton>
        </div>
      </div>
      {helperText && (
        <p className="text-[11px] text-[#7C7069] dark:text-[#A8988B] leading-relaxed">
          {helperText}
        </p>
      )}</div>
  );
}
