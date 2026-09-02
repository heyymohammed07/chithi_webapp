"use client";

import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { IconButton } from "./IconButton";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = "max-w-lg",
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          onCloseRef.current();
        }
      };
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";

      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "";
        previousActiveElement.current?.focus();
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
      onClick={(e) => {
        if (e.target === overlayRef.current) {
          onClose();
        }
      }}
    >
      <div
        className={`relative w-full ${maxWidth} bg-[#FFF8F0] dark:bg-[#170A24] border border-[#F0E2D2] dark:border-[#351D4D] rounded-3xl shadow-2xl overflow-hidden animate-scaleIn transition-colors`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F0E2D2] dark:border-[#351D4D]">
          {title && (
            <h3
              id="modal-title"
              className="text-lg font-serif font-bold text-[#382A22] dark:text-[#FFF8F0] tracking-wide"
            >
              {title}
            </h3>
          )}
          <div className="ml-auto">
            <IconButton label="Close" onClick={onClose} size="sm">
              <X size={18} strokeWidth={1.5} className="text-[#857367] dark:text-[#C5B3A6] hover:text-[#382A22] dark:hover:text-[#FFF8F0]" />
            </IconButton>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 text-[#382A22] dark:text-[#F5EBE6]">{children}</div>
      </div>
    </div>
  );
}
