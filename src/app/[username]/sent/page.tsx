import React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import { WaxSeal } from "@/components/envelope/WaxSeal";
import { Button } from "@/components/ui/Button";

export default async function LetterSentPage(props: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await props.params;

  return (
    <PageShell>
      <div className="max-w-md mx-auto py-16 text-center space-y-6">
        {/* Pressed wax seal illustration */}
        <div className="flex justify-center mb-2 animate-scaleIn">
          <WaxSeal size={64} isCracked={false} />
        </div>

        <h1 className="text-3xl font-serif font-bold text-ivory">
          Your letter is on its way
        </h1>

        <p className="text-sm text-ash leading-relaxed">
          Your words have been sealed and delivered to{" "}
          <span className="text-gold font-medium">@{username}</span>&apos;s mailbox.
          Because this is anonymous, the letter cannot be edited, recalled, or
          tracked.
        </p>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href={`/${username}`} className="w-full sm:w-auto">
            <Button variant="outline" className="w-full">
              Write another letter
            </Button>
          </Link>

          <Link href="/" className="w-full sm:w-auto">
            <Button variant="primary" className="w-full">
              Create your own mailbox
            </Button>
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
