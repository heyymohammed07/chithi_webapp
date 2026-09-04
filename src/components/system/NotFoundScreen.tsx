"use client";

import React from "react";
import Link from "next/link";
import { useLocale } from "@/hooks/useLocale";
import { Button } from "../ui/Button";

export interface NotFoundScreenProps {
  title?: string;
  description?: string;
  actionText?: string;
  actionHref?: string;
}

export function NotFoundScreen({
  title,
  description,
  actionText,
  actionHref = "/",
}: NotFoundScreenProps) {
  const { t } = useLocale();

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full p-8 border border-edge rounded-3xl bg-surface shadow-xl space-y-5 transition-colors">
        {/* Torn-paper motif hairline (§16) */}
        <div className="w-12 h-1 bg-wax mx-auto rounded-full" />

        <h2 className="text-2xl font-serif font-bold text-ink">
          {title || t("errors.notFoundTitle")}
        </h2>

        <p className="text-sm text-ink-muted leading-relaxed">
          {description || t("errors.notFoundDesc")}
        </p>

        <div className="pt-2 flex justify-center">
          <Link href={actionHref}>
            <Button variant="outline" size="md">
              {actionText || t("errors.homeBtn")}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
