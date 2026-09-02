"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useLocale } from "@/hooks/useLocale";

export function Footer() {
  const { t } = useLocale();

  return (
    <footer className="w-full border-t border-[#F0E2D2] dark:border-[#351D4D] bg-[#FAF7F2] dark:bg-[#0C0314] py-8 px-4 sm:px-6 mt-auto transition-colors">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#7C7069] dark:text-[#A592A4]">
        {/* Left: Brand mark with miniature logo + Tagline */}
        <div className="flex items-center gap-2.5">
          <div className="relative w-6 h-6 shrink-0">
            <Image
              src="/logo.png"
              alt="Chithi Logo"
              width={24}
              height={24}
              className="w-full h-full object-contain"
            />
          </div>
          <span className="font-serif font-bold text-[#382A22] dark:text-[#FFF8F0]">
            Chithi চিঠি
          </span>
          <span className="text-[#D4A373] dark:text-[#52336B]">·</span>
          <p className="font-serif italic text-[#7C7069] dark:text-[#A592A4] text-center sm:text-left">
            {t("footer.tagline")}
          </p>
        </div>

        {/* Links row */}
        <div className="flex items-center gap-5">
          <Link
            href="/feed"
            className="hover:text-[#D9534F] transition-colors"
          >
            {t("footer.feed")}
          </Link>
          <Link
            href="/bottle"
            className="hover:text-[#D9534F] transition-colors"
          >
            {t("footer.bottle")}
          </Link>
          <Link
            href="/about"
            className="hover:text-[#D9534F] transition-colors"
          >
            {t("footer.about")}
          </Link>
        </div>
      </div>
    </footer>
  );
}
