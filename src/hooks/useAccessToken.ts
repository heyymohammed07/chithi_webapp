"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * Manages client UI access token state for mailbox owners.
 * Note: Authentic session security relies on server-issued HttpOnly cookies.
 * Client storage is maintained solely for optimistic UI rendering and active key links.
 */
export function useAccessToken(username?: string) {
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const usernameLower = username?.toLowerCase();

  useEffect(() => {
    if (!usernameLower) {
      setIsLoaded(true);
      return;
    }

    try {
      const stored = localStorage.getItem(`chithi:token:${usernameLower}`);
      if (stored) {
        setTokenState(stored);
      }
    } catch {
      // Ignore localStorage read errors
    } finally {
      setIsLoaded(true);
    }
  }, [usernameLower]);

  const saveToken = useCallback(
    (newToken: string) => {
      if (!usernameLower) return;
      setTokenState(newToken);
      try {
        localStorage.setItem(`chithi:token:${usernameLower}`, newToken);
      } catch {
        // Ignore storage errors
      }
    },
    [usernameLower]
  );

  const clearToken = useCallback(() => {
    if (!usernameLower) return;
    setTokenState(null);
    try {
      localStorage.removeItem(`chithi:token:${usernameLower}`);
    } catch {
      // Ignore storage errors
    }
  }, [usernameLower]);

  return {
    token,
    saveToken,
    clearToken,
    isLoaded,
  };
}
