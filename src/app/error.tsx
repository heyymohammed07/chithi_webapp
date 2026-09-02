"use client";

import { useEffect } from "react";
import { ErrorScreen } from "@/components/system/ErrorScreen";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error securely on client
    console.error("[Chithi error caught]", error);
  }, [error]);

  return <ErrorScreen reset={reset} />;
}
