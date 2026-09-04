"use client";

import React from "react";
import { Heart, HeartCrack, Download, Share2, Trash2, Flag } from "lucide-react";
import { IconButton } from "../ui/IconButton";
import { useLocale } from "@/hooks/useLocale";

export interface LetterActionBarProps {
  reaction: "heart" | "heartCrack" | null;
  onReact: (reaction: "heart" | "heartCrack") => void;
  onPostcard: () => void;
  onPublish?: () => void;
  onDelete: () => void;
  onReport: () => void;
  canPublish?: boolean;
}

export function LetterActionBar({
  reaction,
  onReact,
  onPostcard,
  onPublish,
  onDelete,
  onReport,
  canPublish = true,
}: LetterActionBarProps) {
  const { t } = useLocale();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-surface border border-edge rounded-2xl shadow-sm">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onReact("heart")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
            reaction === "heart"
              ? "bg-wax/20 border-wax text-wax"
              : "border-edge text-ink-muted hover:text-ink hover:bg-surface-raised"
          }`}
          title={t("reader.actionReact")}
        >
          <Heart
            size={16}
            strokeWidth={1.5}
            className={reaction === "heart" ? "fill-wax" : ""}
          />
          <span>{reaction === "heart" ? t("reader.actionReacted") : t("reader.actionReact")}</span>
        </button>

        <button
          type="button"
          onClick={() => onReact("heartCrack")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
            reaction === "heartCrack"
              ? "bg-wax/20 border-wax text-wax"
              : "border-edge text-ink-muted hover:text-ink hover:bg-surface-raised"
          }`}
          title="Heartbreak"
        >
          <HeartCrack
            size={16}
            strokeWidth={1.5}
            className={reaction === "heartCrack" ? "fill-wax" : ""}
          />
        </button>
      </div>

      <div className="flex items-center gap-1">
        <IconButton
          label={t("reader.actionPostcard")}
          onClick={onPostcard}
          size="sm"
          variant="ghost"
        >
          <Download size={18} strokeWidth={1.25} />
        </IconButton>

        {canPublish && onPublish && (
          <IconButton
            label={t("reader.actionPublish")}
            onClick={onPublish}
            size="sm"
            variant="ghost"
          >
            <Share2 size={18} strokeWidth={1.25} />
          </IconButton>
        )}

        <IconButton
          label={t("reader.actionReport")}
          onClick={onReport}
          size="sm"
          variant="ghost"
        >
          <Flag size={18} strokeWidth={1.25} />
        </IconButton>

        <IconButton
          label={t("reader.actionDelete")}
          onClick={onDelete}
          size="sm"
          variant="danger"
        >
          <Trash2 size={18} strokeWidth={1.25} />
        </IconButton>
      </div>
    </div>
  );
}
