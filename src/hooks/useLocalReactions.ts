"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * Client-side reaction deduplication cache stored in localStorage.
 *
 * NOTE: This client cache is purely a UX optimization for instantaneous visual feedback.
 * The server-side Redis check (SET NX EX) is the authoritative security and deduplication
 * source of truth. Never remove the server-side check assuming this client cache is sufficient.
 */
export function useLocalReactions() {
  const [reactedIds, setReactedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const stored = localStorage.getItem("chithi:reacted_items");
      if (stored) {
        const arr = JSON.parse(stored);
        if (Array.isArray(arr)) {
          setReactedIds(new Set(arr));
        }
      }
    } catch {
      // Ignore localStorage read errors
    }
  }, []);

  const hasReacted = useCallback(
    (id: string) => {
      return reactedIds.has(id);
    },
    [reactedIds]
  );

  const markReacted = useCallback((id: string) => {
    setReactedIds((prev) => {
      const updated = new Set(prev).add(id);
      try {
        localStorage.setItem(
          "chithi:reacted_items",
          JSON.stringify(Array.from(updated))
        );
      } catch {
        // Ignore storage errors
      }
      return updated;
    });
  }, []);

  return {
    hasReacted,
    markReacted,
  };
}
