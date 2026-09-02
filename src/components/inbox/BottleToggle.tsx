"use client";

import React, { useState } from "react";
import { Toggle } from "../ui/Toggle";
import { useToast } from "@/hooks/useToast";
import { useLocale } from "@/hooks/useLocale";

export interface BottleToggleProps {
  username: string;
  initialValue: boolean;
}

export function BottleToggle({ username, initialValue }: BottleToggleProps) {
  const [acceptsBottles, setAcceptsBottles] = useState(initialValue);
  const [isUpdating, setIsUpdating] = useState(false);
  const { showToast } = useToast();
  const { t } = useLocale();

  const handleToggle = async (nextValue: boolean) => {
    // Optimistic update
    const previous = acceptsBottles;
    setAcceptsBottles(nextValue);
    setIsUpdating(true);

    try {
      const res = await fetch(`/api/mailbox/settings?username=${encodeURIComponent(username)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acceptsBottles: nextValue }),
      });

      const json = await res.json();
      if (!json.ok) {
        // Rollback on failure
        setAcceptsBottles(previous);
        showToast(t(json.error?.message || "errors.generic"), "error");
      }
    } catch {
      setAcceptsBottles(previous);
      showToast(t("errors.generic"), "error");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Toggle
        checked={acceptsBottles}
        onChange={handleToggle}
        disabled={isUpdating}
        label={t("inbox.toolbar.bottleOptIn")}
      />
    </div>
  );
}
