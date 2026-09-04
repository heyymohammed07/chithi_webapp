"use client";

import React from "react";
import { useToast } from "@/hooks/useToast";
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from "lucide-react";

export function ToastViewport() {
  const { toasts, removeToast } = useToast();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const icons = {
          success: <CheckCircle size={18} strokeWidth={1.25} className="text-success shrink-0" />,
          warn: <AlertTriangle size={18} strokeWidth={1.25} className="text-warn shrink-0" />,
          error: <AlertCircle size={18} strokeWidth={1.25} className="text-wax shrink-0" />,
          info: <Info size={18} strokeWidth={1.25} className="text-gold shrink-0" />,
        };

        const icon = icons[toast.type || "info"];

        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center justify-between gap-3 p-3.5 bg-surface-raised border border-edge shadow-2xl rounded-2xl text-ink text-sm"
          >
            <div className="flex items-center gap-2.5">
              {icon}
              <span className="leading-snug font-medium">{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-ink-muted hover:text-ink transition-colors p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10"
              aria-label="Dismiss toast"
            >
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
