"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { LetterComposer } from "@/components/letter/LetterComposer";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/hooks/useLocale";
import { Waves } from "lucide-react";

function BottleContent() {
  const searchParams = useSearchParams();
  const isSent = searchParams?.get("sent") === "true";
  const { t } = useLocale();

  if (isSent) {
    return (
      <PageShell>
        <div className="max-w-md mx-auto py-16 text-center space-y-6">
          <div className="p-8 sm:p-10 rounded-3xl bg-surface border border-edge shadow-xl space-y-5 relative overflow-hidden transition-colors">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-5 washi-tape-skymist rounded-sm pointer-events-none" />

            <div className="w-14 h-14 rounded-2xl border border-sky/30 flex items-center justify-center text-sky bg-sky/10 mx-auto shadow-sm">
              <Waves size={26} strokeWidth={1.5} />
            </div>

            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-ink">
              {t("bottle.successTitle")}
            </h1>

            <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
              {t("bottle.successDesc")}
            </p>

            <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/bottle" className="w-full sm:w-auto">
                <Button variant="primary" className="w-full rounded-full">
                  {t("bottle.castAnother")}
                </Button>
              </Link>
              <Link href="/" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full rounded-full border-edge">
                  {t("nav.home")}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="space-y-8">
        <div className="border-b border-edge pb-6 space-y-2">
          <Badge variant="skymist">
            {t("bottle.badge")}
          </Badge>

          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-ink">
            {t("bottle.title")}
          </h1>

          <p className="text-sm text-ink-muted max-w-xl leading-relaxed">
            {t("bottle.subtitle")}
          </p>
        </div>

        {/* LetterComposer in Bottle Mode */}
        <LetterComposer isBottleMode={true} />
      </div>
    </PageShell>
  );
}

export default function BottlePage() {
  return (
    <Suspense
      fallback={
        <PageShell>
          <div className="space-y-8 animate-pulse">
            <div className="h-8 w-40 bg-surface rounded-full" />
            <div className="h-64 bg-surface rounded-3xl border border-edge" />
          </div>
        </PageShell>
      }
    >
      <BottleContent />
    </Suspense>
  );
}
