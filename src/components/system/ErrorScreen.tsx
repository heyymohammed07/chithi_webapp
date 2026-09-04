"use client";

import React from "react";
import Link from "next/link";
import { useLocale } from "@/hooks/useLocale";
import { Button } from "../ui/Button";

export interface ErrorScreenProps {
  title?: string;
  description?: string;
  reset?: () => void;
}

export function ErrorScreen({ title, description, reset }: ErrorScreenProps) {
  const { t } = useLocale();

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full p-8 border border-edge rounded-3xl bg-surface shadow-xl space-y-5 transition-colors">
        {/* Torn-paper motif hairline (§16) */}
        <div className="w-12 h-1 bg-wax mx-auto rounded-full" />

        <h2 className="text-2xl font-serif font-bold text-ink">
          {title || t("errors.errorTitle")}
        </h2>

        <p className="text-sm text-ink-muted leading-relaxed">
          {description || t("errors.errorDesc")}
        </p>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          {reset && (
            <Button variant="secondary" size="md" onClick={reset}>
              Try Again
            </Button>
          )}

          <Link href="/">
            <Button variant="outline" size="md">
              {t("errors.homeBtn")}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
