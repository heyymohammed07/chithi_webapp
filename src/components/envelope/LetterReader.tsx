"use client";

import React, { useState, useEffect } from "react";
import { X, Heart, HeartCrack, Share2, Download, Trash2, Flag, Music, User, EyeOff } from "lucide-react";
import { PaperSurface } from "../letter/PaperSurface";
import { BurnTimer } from "./BurnTimer";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { IconButton } from "../ui/IconButton";
import { LetterRecord } from "@/lib/types";
import { useLocale } from "@/hooks/useLocale";
import { useToast } from "@/hooks/useToast";
import { useGlobalAudio } from "@/hooks/useGlobalAudio";

export interface LetterReaderProps {
  letter: LetterRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (letterId: string) => Promise<void>;
  onPublish: (letterId: string) => Promise<void>;
  onReact: (letterId: string, reaction: "heart" | "heartCrack") => Promise<void>;
  onDownloadPostcard: (letter: LetterRecord) => void;
  onReport: (letterId: string) => void;
  username: string;
}

export function LetterReader({
  letter,
  isOpen,
  onClose,
  onDelete,
  onPublish,
  onReact,
  onDownloadPostcard,
  onReport,
}: LetterReaderProps) {
  const { t, locale } = useLocale();
  const { showToast } = useToast();
  const { playSong } = useGlobalAudio();

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Section 20: Auto stream attached song via global YouTube audio engine on open
  useEffect(() => {
    if (isOpen && letter?.attachedSong) {
      playSong(letter.attachedSong);
    }
  }, [isOpen, letter, playSong]);

  if (!isOpen || !letter) return null;

  const handleReact = async (reaction: "heart" | "heartCrack") => {
    try {
      await onReact(letter.id, reaction);
      showToast(t("reader.actionReacted"), "success");
    } catch {
      showToast(t("errors.generic"), "error");
    }
  };

  const handleDelete = async () => {
    setIsActionLoading(true);
    try {
      await onDelete(letter.id);
      setConfirmDelete(false);
      onClose();
      showToast("Letter burned permanently", "success");
    } catch {
      showToast(t("errors.generic"), "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handlePublish = async () => {
    setIsActionLoading(true);
    try {
      await onPublish(letter.id);
      setConfirmPublish(false);
      showToast("Letter published to Benami Kham wall", "success");
    } catch (err: unknown) {
      const error = err as { message?: string };
      showToast(t(error?.message || "errors.generic"), "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#2D2522]/60 backdrop-blur-sm overflow-y-auto"
        role="dialog"
        aria-modal="true"
      >
        <div className="relative w-full max-w-2xl my-auto space-y-4">
          {/* Top Bar with BurnTimer & Attached Song banner */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 flex items-center gap-3">
              {letter.burnAt !== null && (
                <BurnTimer
                  burnAt={letter.burnAt}
                  onBurned={() => {
                    onDelete(letter.id);
                    onClose();
                  }}
                />
              )}

              {letter.attachedSong && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FFFDF9] border border-[#EBE3D5] shadow-sm text-xs text-[#2D2522]">
                  <Music size={13} className="text-[#D9534F] animate-bounce" />
                  <span className="font-serif font-medium truncate max-w-[150px] sm:max-w-[200px]">
                    {letter.attachedSong.title}
                  </span>
                  <span className="text-[10px] text-[#7C7069] truncate max-w-[100px]">
                    · {letter.attachedSong.artist}
                  </span>
                </div>
              )}

              {letter.senderName ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFE5B4]/60 border border-[#FCD34D] shadow-xs text-xs text-[#382A22] font-medium">
                  <User size={13} className="text-[#E88B60]" />
                  <span>{locale === "bn" ? `প্রেরক: ${letter.senderName}` : `From: ${letter.senderName}`}</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FAF7F2] border border-[#EBE3D5] text-[11px] text-[#7C7069] font-mono">
                  <EyeOff size={12} />
                  <span>{locale === "bn" ? "বেনামী প্রেরক" : "Anonymous"}</span>
                </div>
              )}
            </div>

            <IconButton label="Close" onClick={onClose} size="sm" variant="secondary">
              <X size={18} strokeWidth={1.5} />
            </IconButton>
          </div>

          {/* Paper Letter Surface */}
          <div className="overflow-hidden shadow-2xl rounded-envelope">
            <PaperSurface
              paper={letter.paper}
              stamp={letter.stamp}
              stampSeed={letter.id}
              variant="reader"
            >
              {/* Body */}
              <div className="whitespace-pre-wrap break-words min-h-[220px]">
                {letter.body}
              </div>

              {/* Sender signature if named */}
              {letter.senderName && (
                <div className="mt-8 pt-4 text-right font-hand text-base font-bold opacity-90 italic">
                  — {letter.senderName}
                </div>
              )}

              {/* Hints */}
              {letter.hints && letter.hints.length > 0 && (
                <div className="mt-10 pt-6 border-t border-current/20 space-y-2 text-xs opacity-80">
                  <span className="font-accent uppercase tracking-widest text-[11px] block font-semibold">
                    {t("reader.hintsTitle")}
                  </span>
                  {letter.hints.map((hint, idx) => (
                    <p key={idx} className="italic">
                      • {hint}
                    </p>
                  ))}
                </div>
              )}
            </PaperSurface>
          </div>

          {/* Action Bar Beneath Letter */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#FFFDF9] border border-[#EBE3D5] rounded-3xl shadow-[0_12px_32px_-8px_rgba(78,59,44,0.06)]">
            {/* Left: Keepsake reactions */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleReact("heart")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  letter.reaction === "heart"
                    ? "bg-[#FEF2F2] border-[#FCA5A5] text-[#D9534F]"
                    : "border-transparent text-[#7C7069] hover:text-[#2D2522] hover:bg-[#FAF7F2]"
                }`}
                title={t("reader.actionReact")}
              >
                <Heart
                  size={16}
                  strokeWidth={1.5}
                  className={letter.reaction === "heart" ? "fill-[#D9534F]" : ""}
                />
                <span>{letter.reaction === "heart" ? t("reader.actionReacted") : t("reader.actionReact")}</span>
              </button>

              <button
                type="button"
                onClick={() => handleReact("heartCrack")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  letter.reaction === "heartCrack"
                    ? "bg-[#FEF2F2] border-[#FCA5A5] text-[#D9534F]"
                    : "border-transparent text-[#7C7069] hover:text-[#2D2522] hover:bg-[#FAF7F2]"
                }`}
                title="Heartbreak"
              >
                <HeartCrack
                  size={16}
                  strokeWidth={1.5}
                  className={letter.reaction === "heartCrack" ? "fill-[#D9534F]" : ""}
                />
              </button>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1.5">
              <IconButton
                label={t("reader.actionPostcard")}
                onClick={() => onDownloadPostcard(letter)}
                size="sm"
                variant="ghost"
              >
                <Download size={18} strokeWidth={1.5} />
              </IconButton>

              {!letter.burnAfterReading && !letter.published && (
                <IconButton
                  label={t("reader.actionPublish")}
                  onClick={() => setConfirmPublish(true)}
                  size="sm"
                  variant="ghost"
                >
                  <Share2 size={18} strokeWidth={1.5} />
                </IconButton>
              )}

              <IconButton
                label={t("reader.actionReport")}
                onClick={() => onReport(letter.id)}
                size="sm"
                variant="ghost"
              >
                <Flag size={18} strokeWidth={1.5} />
              </IconButton>

              <IconButton
                label={t("reader.actionDelete")}
                onClick={() => setConfirmDelete(true)}
                size="sm"
                variant="danger"
              >
                <Trash2 size={18} strokeWidth={1.5} />
              </IconButton>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={t("reader.confirmDeleteTitle")}
      >
        <div className="space-y-4">
          <p className="text-sm text-[#7C7069]">
            {t("reader.confirmDeleteDesc")}
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => setConfirmDelete(false)}
              disabled={isActionLoading}
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={isActionLoading}
              className="rounded-full"
            >
              {t("reader.confirmDeleteBtn")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Publish Confirmation Modal */}
      <Modal
        isOpen={confirmPublish}
        onClose={() => setConfirmPublish(false)}
        title={t("reader.confirmPublishTitle")}
      >
        <div className="space-y-4">
          <p className="text-sm text-[#7C7069] leading-relaxed">
            {t("reader.confirmPublishDesc")}
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => setConfirmPublish(false)}
              disabled={isActionLoading}
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handlePublish}
              isLoading={isActionLoading}
              className="rounded-full"
            >
              {t("reader.confirmPublishBtn")}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
