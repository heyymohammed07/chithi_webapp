"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "./useLocale";

export function useLetterNotifications(username?: string | null) {
  const router = useRouter();
  const { locale } = useLocale();
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const lastUnreadRef = useRef<number | null>(null);

  // Check support on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    } else {
      setPermission("unsupported");
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    try {
      const res = await Notification.requestPermission();
      setPermission(res);
      if (res === "granted" && username) {
        fetch(`/api/mailbox/profile?username=${encodeURIComponent(username)}`)
          .then((r) => r.json())
          .then((json) => {
            if (json.ok && typeof json.data?.unreadCount === "number") {
              lastUnreadRef.current = json.data.unreadCount;
            }
          })
          .catch(() => {});
      }
    } catch (err) {
      console.warn("[Notification request error]", err);
    }
  }, [username]);

  // Polling effect when permission === "granted" and username is provided
  useEffect(() => {
    if (permission !== "granted" || !username) return;

    let isMounted = true;

    const checkNewLetters = async () => {
      try {
        const res = await fetch(
          `/api/mailbox/profile?username=${encodeURIComponent(username)}`
        );
        const json = await res.json();
        if (!isMounted || !json.ok) return;

        const currentUnread = json.data?.unreadCount ?? 0;

        if (lastUnreadRef.current !== null && currentUnread > lastUnreadRef.current) {
          const title = locale === "bn" ? "চিঠি এসেছে! 💌" : "New Letter Arrived! 💌";
          const body =
            locale === "bn"
              ? "আপনার ইনবক্সে একটি নতুন চিঠি এসে পৌঁছেছে। খুলে দেখুন!"
              : "A new letter has just arrived in your mailbox. Open to read!";

          const notif = new Notification(title, {
            body,
            icon: "/logo.png",
            tag: "new-chithi-letter",
          });

          notif.onclick = () => {
            window.focus();
            router.push(`/inbox/${encodeURIComponent(username)}`);
          };
        }

        lastUnreadRef.current = currentUnread;
      } catch {
        // silently fallback on network error
      }
    };

    // Run initial prime
    checkNewLetters();

    // Poll every 35 seconds
    const interval = setInterval(checkNewLetters, 35000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [permission, username, locale, router]);

  return {
    permission,
    isSupported: permission !== "unsupported",
    isGranted: permission === "granted",
    requestPermission,
  };
}
