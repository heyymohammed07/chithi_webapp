import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicMailbox } from "@/lib/mailbox";
import { PageShell } from "@/components/layout/PageShell";
import { LetterComposer } from "@/components/letter/LetterComposer";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  await params;
  return {
    title: "Chithi",
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: { index: false, follow: false },
    },
    alternates: { canonical: null },
  };
}

export default async function PublicWriteLetterPage(props: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await props.params;

  let mailboxMeta;
  try {
    mailboxMeta = await getPublicMailbox(username);
  } catch {
    notFound();
  }

  if (!mailboxMeta || !mailboxMeta.exists) {
    notFound();
  }

  return (
    <PageShell>
      <div className="space-y-8 pb-36 sm:pb-44">
        {/* Recipient Header Banner */}
        <div className="border-b border-edge pb-6 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-ink">
              Writing to <span className="text-wax">@{mailboxMeta.username}</span>
            </h1>
            <p className="text-xs text-ink-muted mt-1">
              Your words will be delivered anonymously and securely.
            </p>
          </div>
        </div>

        {/* Letter Composer */}
        <LetterComposer
          recipientUsername={mailboxMeta.username}
        />
      </div>
    </PageShell>
  );
}
