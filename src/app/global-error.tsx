"use client";

import React from "react";
import "./globals.css";

export default function GlobalError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-canvas text-ink flex items-center justify-center p-6">
        <div className="max-w-md w-full p-8 border border-edge rounded-3xl bg-surface shadow-xl text-center space-y-5">
          <div className="w-12 h-1 bg-wax mx-auto rounded-full" />
          <h2 className="text-2xl font-serif font-bold text-ink">
            The ink smudged.
          </h2>
          <p className="text-sm text-ink-muted leading-relaxed">
            A critical fault occurred in the postal ledger. You may try refreshing
            the connection.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="px-6 py-2.5 rounded-full bg-wax hover:bg-wax-pressed text-white text-sm font-medium transition-colors cursor-pointer"
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
