"use client";

import React, { use } from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import { LetterComposer } from "@/components/letter/LetterComposer";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/hooks/useLocale";
import { Waves } from "lucide-react";

export default function BottlePage(props: {
  searchParams?: Promise<{ sent?: string }>;
}) {
  const searchParams = props.searchParams ? use(props.searchParams) : undefined;
  const isSent = searchParams?.sent === "true";
  const { t } = useLocale();

  if (isSent) {
    return (
      <PageShell>
        <div className="max-w-md mx-auto py-16 text-center space-y-6">
          <div className="p-8 sm:p-10 rounded-3xl bg-[#FFFDF9] dark:bg-[#170A24] border border-[#EBE3D5] dark:border-[#351D4D] shadow-[0_12px_32px_-8px_rgba(78,59,44,0.06)] dark:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5)] space-y-5 relative overflow-hidden transition-colors">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-5 washi-tape-skymist rounded-sm pointer-events-none" />

            <div className="w-14 h-14 rounded-2xl border border-[#BAE6FD] dark:border-[#1E4868] flex items-center justify-center text-[#0284C7] bg-[#E0F2FE] dark:bg-[#0B2538] mx-auto shadow-sm">
              <Waves size={26} strokeWidth={1.5} />
            </div>

            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#2D2522] dark:text-[#FFF8F0]">
              {t("bottle.successTitle")}
            </h1>

            <p className="text-xs sm:text-sm text-[#7C7069] dark:text-[#A592A4] leading-relaxed">
              {t("bottle.successDesc")}
            </p>

            <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/bottle" className="w-full sm:w-auto">
                <Button variant="primary" className="w-full rounded-full">
                  {t("bottle.castAnother")}
                </Button>
              </Link>
              <Link href="/" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full rounded-full border-[#EBE3D5] dark:border-[#351D4D]">
                  Home
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
        <div className="border-b border-[#EBE3D5] dark:border-[#351D4D] pb-6 space-y-2">
          <Badge variant="skymist">
            {t("bottle.badge")}
          </Badge>

          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#2D2522] dark:text-[#FFF8F0]">
            {t("bottle.title")}
          </h1>

          <p className="text-sm text-[#7C7069] dark:text-[#A592A4] max-w-xl leading-relaxed">
            {t("bottle.subtitle")}
          </p>
        </div>

        {/* LetterComposer in Bottle Mode */}
        <LetterComposer isBottleMode={true} />
      </div>
    </PageShell>
  );
}
