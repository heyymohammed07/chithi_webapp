import React from "react";
import { notFound } from "next/navigation";
import { getPublicMailbox } from "@/lib/mailbox";
import { PageShell } from "@/components/layout/PageShell";
import { LetterComposer } from "@/components/letter/LetterComposer";
import { formatDistanceToNow } from "date-fns";

export const dynamic = "force-dynamic";

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

  const remainingDistance = formatDistanceToNow(new Date(mailboxMeta.expiresAt), {
    addSuffix: true,
  });

  return (
    <PageShell>
      <div className="space-y-8 pb-36 sm:pb-44">
        {/* Recipient Header Banner */}
        <div className="border-b border-[#F0E2D2] dark:border-[#351D4D] pb-6 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#382A22] dark:text-[#FFF8F0]">
              Writing to <span className="text-[#E88B60]">@{mailboxMeta.username}</span>
            </h1>
            <p className="text-xs text-[#857367] dark:text-[#A592A4] mt-1">
              Your words will be delivered anonymously and securely.
            </p>
          </div>

          <div className="text-xs font-mono text-[#857367] dark:text-[#A592A4] italic">
            Closes {remainingDistance}
          </div>
        </div>

        {/* Letter Composer */}
        <LetterComposer
          recipientUsername={mailboxMeta.username}
          mailboxExpiresAt={mailboxMeta.expiresAt}
        />
      </div>
    </PageShell>
  );
}
