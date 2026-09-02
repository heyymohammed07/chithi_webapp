"use client";

import React from "react";
import { Plus, X } from "lucide-react";
import { Input } from "../ui/Input";
import { IconButton } from "../ui/IconButton";
import { useLocale } from "@/hooks/useLocale";
import { HINT_MAX_COUNT, HINT_MAX_LEN } from "@/lib/constants";

export interface HintFieldsProps {
  hints: string[];
  onChange: (hints: string[]) => void;
}

export function HintFields({ hints, onChange }: HintFieldsProps) {
  const { t } = useLocale();

  const handleUpdate = (index: number, val: string) => {
    const updated = [...hints];
    updated[index] = val.slice(0, HINT_MAX_LEN);
    onChange(updated);
  };

  const handleAdd = () => {
    if (hints.length < HINT_MAX_COUNT) {
      onChange([...hints, ""]);
    }
  };

  const handleRemove = (index: number) => {
    const updated = hints.filter((_, i) => i !== index);
    onChange(updated.length === 0 ? [""] : updated);
  };

  const effectiveHints = hints.length === 0 ? [""] : hints;
  const canAddMore =
    effectiveHints.length < HINT_MAX_COUNT &&
    (effectiveHints[effectiveHints.length - 1]?.trim().length ?? 0) > 0;

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-mono uppercase tracking-wider text-[#7A6658] dark:text-[#C5B3A6]">
          {t("composer.hintsHeading")}
        </label>
        <p className="text-xs text-[#7A6658] dark:text-[#C5B3A6] mt-0.5">
          {t("composer.hintsHelp")}
        </p>
      </div>

      <div className="space-y-2">
        {effectiveHints.map((hint, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <Input
              value={hint}
              maxLength={HINT_MAX_LEN}
              placeholder={`${t("composer.hintPlaceholder")} ${idx + 1}`}
              onChange={(e) => handleUpdate(idx, e.target.value)}
              className="flex-1 text-xs"
            />
            {effectiveHints.length > 1 && (
              <IconButton
                label={t("composer.removeHint")}
                onClick={() => handleRemove(idx)}
                size="sm"
                variant="danger"
              >
                <X size={16} strokeWidth={1.25} />
              </IconButton>
            )}
          </div>
        ))}
      </div>

      {canAddMore && (
        <button
          type="button"
          onClick={handleAdd}
          className="inline-flex items-center gap-1.5 text-xs text-[#E88B60] hover:text-[#D67448] dark:hover:text-[#FFF8F0] transition-colors font-medium py-1"
        >
          <Plus size={14} strokeWidth={1.25} />
          <span>{t("composer.addHint")}</span>
        </button>
      )}
    </div>
  );
}
