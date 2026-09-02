"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { LocaleToggle } from "./LocaleToggle";
import { ThemeToggle } from "./ThemeToggle";
import { useLocale } from "@/hooks/useLocale";
import { useCountdown } from "@/hooks/useCountdown";
import { Scroll, Waves, KeyRound, Clock } from "lucide-react";
import { motion } from "framer-motion";

export function Header() {
  const { locale } = useLocale();

  const [activeUser, setActiveUser] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number>(0);

  // Scan localStorage and cookies for active mailbox token
  const scanSession = () => {
    if (typeof window === "undefined") return;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("chithi:token:")) {
          const username = key.replace("chithi:token:", "").trim();
          if (username) {
            setActiveUser(username);
            return;
          }
        }
      }

      if (typeof document !== "undefined") {
        const match = document.cookie.match(/chithi_s_([a-zA-Z0-9_-]+)=/);
        if (match && match[1]) {
          setActiveUser(match[1]);
          return;
        }
      }

      setActiveUser(null);
      setExpiresAt(0);
    } catch {
      setActiveUser(null);
      setExpiresAt(0);
    }
  };

  useEffect(() => {
    scanSession();

    // Listen for storage events (e.g. login from another tab or creation)
    window.addEventListener("storage", scanSession);
    return () => window.removeEventListener("storage", scanSession);
  }, []);

  // Fetch expiry for live countdown pill
  useEffect(() => {
    if (!activeUser) {
      setExpiresAt(0);
      return;
    }

    let isMounted = true;
    fetch(`/api/mailbox/${encodeURIComponent(activeUser.toLowerCase())}`)
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json.ok && json.data?.expiresAt) {
          setExpiresAt(json.data.expiresAt);
        }
      })
      .catch(() => {
        // Fallback silently if offline
      });

    return () => {
      isMounted = false;
    };
  }, [activeUser]);

  const countdown = useCountdown(expiresAt);

  return (
    <header className="sticky top-0 z-40 w-full bg-[#FFFDF9]/90 dark:bg-[#0C0314]/90 backdrop-blur-md border-b border-[#F0E2D2] dark:border-[#351D4D] transition-colors duration-200">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand Logo & Wordmark Left */}
        <Link
          href="/"
          className="group inline-flex items-center gap-2 sm:gap-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#E88B60] focus-visible:outline-offset-2 rounded-xl py-1 px-1 shrink-0"
        >
          <div className="relative w-7 h-7 sm:w-9 sm:h-9 shrink-0 transition-transform duration-200 group-hover:scale-105 group-hover:-rotate-2">
            <Image
              src="/logo.png"
              alt="Chithi Logo"
              width={36}
              height={36}
              className="w-full h-full object-contain drop-shadow-sm"
              priority
            />
          </div>
          <div className="inline-flex items-baseline gap-1 sm:gap-1.5">
            <span className="font-serif text-xl sm:text-3xl font-bold tracking-tight text-[#382A22] dark:text-[#FFF8F0] group-hover:text-[#E88B60] transition-colors">
              Chithi
            </span>
            <span className="font-serif text-xs sm:text-base font-normal text-[#E88B60] group-hover:text-[#D67448] transition-colors">
              চিঠি
            </span>
          </div>
        </Link>

        {/* Center: Stylized Navigation Pill Buttons (Desktop) */}
        <div className="hidden md:flex items-center gap-3">
          {/* Benami Kham (Public Wall) Interactive Pill */}
          <Link href="/feed">
            <motion.div
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#F0E2D2] dark:border-[#351D4D] bg-[#FFF8F0] dark:bg-[#170A24] hover:bg-[#FFE5B4]/30 dark:hover:bg-[#2B143D] text-[#382A22] dark:text-[#F5EBE6] text-xs font-medium shadow-sm transition-all cursor-pointer group"
            >
              <Scroll size={15} strokeWidth={1.5} className="text-[#E88B60] group-hover:rotate-6 transition-transform" />
              <span>{locale === "bn" ? "বেনামী খাম" : "Benami Kham"}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#E88B60]/70 group-hover:bg-[#E88B60] animate-pulse" />
            </motion.div>
          </Link>

          {/* Bottle Drop Interactive Pill */}
          <Link href="/bottle">
            <motion.div
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#F0E2D2] dark:border-[#351D4D] bg-[#FFF8F0] dark:bg-[#170A24] hover:bg-[#FFE5B4]/30 dark:hover:bg-[#2B143D] text-[#382A22] dark:text-[#F5EBE6] text-xs font-medium shadow-sm transition-all cursor-pointer group"
            >
              <Waves size={15} strokeWidth={1.5} className="text-[#0284C7] group-hover:text-[#E88B60] transition-colors" />
              <span>{locale === "bn" ? "চিঠির বোতল" : "Drift Bottle"}</span>
            </motion.div>
          </Link>
        </div>

        {/* Right: Active Session Navigation to /profile OR Login + Theme + Locale Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {activeUser ? (
            /* Active Mailbox Navigation Link to /profile */
            <Link
              href="/profile"
              aria-label={locale === "bn" ? `${activeUser}-এর প্রোফাইল` : `Profile for @${activeUser}`}
            >
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 rounded-full bg-[#FFF8F0] dark:bg-[#170A24] border border-[#F0E2D2] dark:border-[#351D4D] text-xs font-medium text-[#382A22] dark:text-[#F5EBE6] shadow-sm hover:border-[#E88B60] hover:shadow-md transition-all cursor-pointer"
              >
                <div className="w-5 h-5 rounded-full bg-[#E88B60] text-[11px] font-serif font-bold text-white flex items-center justify-center shrink-0">
                  {activeUser.charAt(0).toUpperCase()}
                </div>
                <span className="font-mono text-[#382A22] dark:text-[#FFF8F0] font-semibold truncate max-w-[80px] sm:max-w-[120px]">
                  @{activeUser}
                </span>
                {expiresAt > 0 && !countdown.isExpired && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-[#857367] dark:text-[#A592A4] border-l border-[#F0E2D2] dark:border-[#351D4D] pl-2">
                    <Clock size={12} className="text-[#E88B60]" />
                    <span>{countdown.formatted}</span>
                  </span>
                )}
                <span className="w-1.5 h-1.5 rounded-full bg-[#065F46] animate-pulse shrink-0" />
              </motion.div>
            </Link>
          ) : (
            /* No Session: Prominent Passcode Login Button with responsive text */
            <Link href="/recover">
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-full border border-[#F0E2D2] dark:border-[#351D4D] bg-[#FFF8F0] dark:bg-[#170A24] hover:bg-[#FFE5B4]/30 dark:hover:bg-[#2B143D] hover:border-[#E88B60] text-xs font-medium text-[#857367] dark:text-[#A592A4] hover:text-[#382A22] dark:hover:text-[#FFF8F0] shadow-sm transition-all cursor-pointer"
              >
                <KeyRound size={13} strokeWidth={1.5} className="text-[#E88B60] shrink-0" />
                <span className="hidden sm:inline">{locale === "bn" ? "পাসকোড দিয়ে লগইন" : "Login with Passcode"}</span>
                <span className="sm:hidden">{locale === "bn" ? "লগইন" : "Login"}</span>
              </motion.div>
            </Link>
          )}

          <ThemeToggle />
          <LocaleToggle />
        </div>
      </div>
    </header>
  );
}
