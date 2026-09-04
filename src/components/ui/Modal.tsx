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
  const modalContentRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;

      const focusableSelector =
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

      // Auto-focus first focusable element inside modal
      const timer = setTimeout(() => {
        if (modalContentRef.current) {
          const focusables = modalContentRef.current.querySelectorAll<HTMLElement>(focusableSelector);
          focusables[0]?.focus();
        }
      }, 50);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onCloseRef.current();
          return;
        }

        if (e.key === "Tab") {
          if (!modalContentRef.current) return;
          const focusables = Array.from(
            modalContentRef.current.querySelectorAll<HTMLElement>(focusableSelector)
          );
          if (focusables.length === 0) {
            e.preventDefault();
            return;
          }
          const first = focusables[0];
          const last = focusables[focusables.length - 1];
          if (!first || !last) return;

          if (e.shiftKey) {
            if (document.activeElement === first || !modalContentRef.current.contains(document.activeElement)) {
              e.preventDefault();
              last.focus();
            }
          } else {
            if (document.activeElement === last || !modalContentRef.current.contains(document.activeElement)) {
              e.preventDefault();
              first.focus();
            }
          }
        }
      };

      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";

      return () => {
        clearTimeout(timer);
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
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
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
        ref={modalContentRef}
        className={`relative w-full ${maxWidth} bg-surface border border-edge rounded-3xl shadow-2xl overflow-hidden animate-scaleIn transition-colors`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-edge">
          {title && (
            <h3
              id="modal-title"
              className="text-lg font-serif font-bold text-ink tracking-wide"
            >
              {title}
            </h3>
          )}
          <div className="ml-auto">
            <IconButton label="Close" onClick={onClose} size="sm">
              <X size={18} strokeWidth={1.5} className="text-ink-muted hover:text-ink" />
            </IconButton>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 text-ink">{children}</div>
      </div>
    </div>
  );
}
