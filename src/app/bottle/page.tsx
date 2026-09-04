"use client";

import React, { use } from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import { LetterComposer } from "@/components/letter/LetterComposer";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/hooks/useLocale";
import { useSession } from "@/context/SessionContext";
import { Waves, MailPlus, KeyRound, ArrowLeft } from "lucide-react";

export default function BottlePage(props: {
  searchParams?: Promise<{ sent?: string }>;
}) {
  const searchParams = props.searchParams ? use(props.searchParams) : undefined;
  const isSent = searchParams?.sent === "true";
  const { t } = useLocale();
  const { activeUsername, sessions, isLoading } = useSession();

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

  // Loading state while discovering active session
  if (isLoading) {
    return (
      <PageShell>
        <div className="max-w-md mx-auto py-24 text-center space-y-4">
          <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-xs sm:text-sm text-ink-muted">{t("app.loading")}</p>
        </div>
      </PageShell>
    );
  }

  // Auth-required state when user has no active session (§UI-04)
  const hasValidSession = Boolean(activeUsername || sessions.length > 0);
  if (!hasValidSession) {
    return (
      <PageShell>
        <div className="max-w-md mx-auto py-12 text-center space-y-6">
          <div className="p-8 sm:p-10 rounded-3xl bg-surface border border-edge shadow-xl space-y-6 relative overflow-hidden transition-colors">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-5 washi-tape-skymist rounded-sm pointer-events-none" />

            <div className="w-16 h-16 rounded-2xl border border-sky/30 flex items-center justify-center text-sky bg-sky/10 mx-auto shadow-sm">
              <Waves size={30} strokeWidth={1.5} />
            </div>

            <div className="space-y-2">
              <Badge variant="skymist" className="mb-2">
                {t("bottle.badge")}
              </Badge>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-ink">
                {t("bottle.authRequiredTitle")}
              </h1>
              <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
                {t("bottle.authRequiredSubtitle")}
              </p>
            </div>

            <div className="pt-2 space-y-3">
              <Link href="/" className="block w-full">
                <Button variant="primary" className="w-full rounded-full flex items-center justify-center gap-2">
                  <MailPlus size={17} />
                  <span>{t("bottle.authRequiredCreateBtn")}</span>
                </Button>
              </Link>
              <Link href="/recover" className="block w-full">
                <Button variant="outline" className="w-full rounded-full border-edge flex items-center justify-center gap-2">
                  <KeyRound size={17} />
                  <span>{t("bottle.authRequiredLoginBtn")}</span>
                </Button>
              </Link>
              <div className="pt-2">
                <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink transition-colors">
                  <ArrowLeft size={14} />
                  <span>{t("nav.home")}</span>
                </Link>
              </div>
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
