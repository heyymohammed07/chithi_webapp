"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";

export interface SessionInfo {
  username: string;
  name: string;
  expiresAt: number;
  unreadCount: number;
}

export interface SessionContextValue {
  sessions: SessionInfo[];
  activeUsername: string | null;
  activeSession: SessionInfo | null;
  isLoading: boolean;
  setActiveUsername: (username: string) => void;
  refresh: () => Promise<void>;
  logout: (username?: string) => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [activeUsername, setActiveUsernameState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const storedActive =
        typeof window !== "undefined" ? localStorage.getItem("chithi:active") : null;

      const url = storedActive
        ? `/api/session?preferred=${encodeURIComponent(storedActive)}`
        : "/api/session";

      const res = await fetch(url);
      const json = await res.json();

      if (json.ok && json.data) {
        const list: SessionInfo[] = json.data.sessions || [];
        setSessions(list);

        let chosen: string | null = null;
        if (storedActive && list.some((s) => s.username.toLowerCase() === storedActive.toLowerCase())) {
          chosen = storedActive.toLowerCase();
        } else if (json.data.active) {
          chosen = json.data.active.toLowerCase();
        } else if (list.length > 0) {
          chosen = list[0]!.username.toLowerCase();
        }

        setActiveUsernameState(chosen);
        if (chosen && typeof window !== "undefined") {
          localStorage.setItem("chithi:active", chosen);
        } else if (!chosen && typeof window !== "undefined") {
          localStorage.removeItem("chithi:active");
        }
      } else {
        setSessions([]);
        setActiveUsernameState(null);
        if (typeof window !== "undefined") {
          localStorage.removeItem("chithi:active");
        }
      }
    } catch (err) {
      console.error("[SessionProvider refresh error]", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setActiveUsername = useCallback(
    (newUsername: string) => {
      const lower = newUsername.toLowerCase();
      if (sessions.some((s) => s.username.toLowerCase() === lower)) {
        setActiveUsernameState(lower);
        if (typeof window !== "undefined") {
          localStorage.setItem("chithi:active", lower);
        }
      }
    },
    [sessions]
  );

  const logout = useCallback(
    async (usernameToLogout?: string) => {
      const target = (usernameToLogout || activeUsername)?.toLowerCase();
      if (!target) return;

      try {
        await fetch("/api/session/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: target }),
        });

        if (typeof window !== "undefined") {
          localStorage.removeItem(`chithi:token:${target}`);
          if (localStorage.getItem("chithi:active") === target) {
            localStorage.removeItem("chithi:active");
          }
        }

        await refresh();
      } catch (err) {
        console.error("[SessionProvider logout error]", err);
      }
    },
    [activeUsername, refresh]
  );

  // Initial load
  useEffect(() => {
    refresh();

    // Cross-tab synchronization via storage event
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "chithi:active" || (e.key && e.key.startsWith("chithi:token:"))) {
        refresh();
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [refresh]);

  const activeSession = useMemo(() => {
    if (!activeUsername) return null;
    return (
      sessions.find((s) => s.username.toLowerCase() === activeUsername.toLowerCase()) || null
    );
  }, [sessions, activeUsername]);

  const value = useMemo(
    () => ({
      sessions,
      activeUsername,
      activeSession,
      isLoading,
      setActiveUsername,
      refresh,
      logout,
    }),
    [sessions, activeUsername, activeSession, isLoading, setActiveUsername, refresh, logout]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return ctx;
}
