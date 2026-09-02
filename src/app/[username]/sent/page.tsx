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

        <h2 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 dark:text-stone-100 tracking-tight text-center">
          Your letter is on its way
        </h2>

        <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed max-w-sm mx-auto">
          Your words have been sealed and delivered to{" "}
          <span className="text-[#D9534F] dark:text-[#E88B60] font-semibold">@{username}</span>&apos;s mailbox.
          Because this is anonymous, the letter cannot be edited, recalled, or
          tracked.
        </p>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href={`/${username}`} className="w-full sm:w-auto">
            <Button
              variant="outline"
              className="w-full text-stone-800 dark:text-stone-200 border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800"
            >
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
