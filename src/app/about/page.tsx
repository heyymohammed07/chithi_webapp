"use client";

import React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/hooks/useLocale";

export default function AboutPage() {
  const { t } = useLocale();

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto py-8 space-y-10">
        {/* Header */}
        <div className="space-y-3 border-b border-ink-hairline pb-6 text-center">
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-stone-900 dark:text-[#FFF8F0]">
            {t("about.title")}
          </h1>
          <p className="text-sm font-serif italic text-amber-700 dark:text-[#E88B60]">
            Quiet thoughts in a noisy world.
          </p>
        </div>

        {/* Prose Chapters */}
        <div className="space-y-8 text-base leading-relaxed font-sans divide-y divide-stone-200 dark:divide-[#351D4D]/60">
          <div className="space-y-3 pt-2">
            <h2 className="text-lg font-serif font-semibold text-amber-900 dark:text-[#E88B60]">
              The Philosophy
            </h2>
            <p className="text-stone-800 dark:text-[#C8B8D0]">{t("about.prose.p1")}</p>
          </div>

          <div className="space-y-3 pt-6">
            <h2 className="text-lg font-serif font-semibold text-amber-900 dark:text-[#E88B60]">
              Privacy by Design
            </h2>
            <p className="text-stone-800 dark:text-[#C8B8D0]">{t("about.prose.p2")}</p>
          </div>

          <div className="space-y-3 pt-6">
            <h2 className="text-lg font-serif font-semibold text-amber-900 dark:text-[#E88B60]">
              Hard Expiry &amp; Redis TTL
            </h2>
            <p className="text-stone-800 dark:text-[#C8B8D0]">{t("about.prose.p3")}</p>
          </div>

          <div className="space-y-3 pt-6">
            <h2 className="text-lg font-serif font-semibold text-amber-900 dark:text-[#E88B60]">
              Message in a Bottle &amp; Plain Text
            </h2>
            <p className="text-stone-800 dark:text-[#C8B8D0]">{t("about.prose.p4")}</p>
          </div>

          <div className="space-y-3 pt-6">
            <h2 className="text-lg font-serif font-semibold text-amber-900 dark:text-[#E88B60]">
              Safety &amp; Automatic Moderation
            </h2>
            <p className="text-stone-800 dark:text-[#C8B8D0]">{t("about.prose.p5")}</p>
          </div>
        </div>

        {/* Action Call to Action */}
        <div className="pt-8 border-t border-stone-200 dark:border-[#351D4D] flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/" className="w-full sm:w-auto">
            <Button variant="primary" size="lg" className="w-full">
              Create Your Mailbox
            </Button>
          </Link>
          <Link href="/feed" className="w-full sm:w-auto">
            <Button variant="outline" size="lg" className="w-full">
              Explore Benami Kham
            </Button>
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
