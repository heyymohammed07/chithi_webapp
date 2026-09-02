"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "@/hooks/useTheme";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-8 h-8 rounded-full border border-[#F0E2D2] dark:border-[#351D4D] bg-[#FFF8F0] dark:bg-[#170A24] opacity-50" />
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to Day Mode" : "Switch to Dark Mode"}
      title={isDark ? "Switch to Day Mode" : "Switch to Dark Mode"}
      className="relative w-8 h-8 rounded-full border border-[#F0E2D2] dark:border-[#351D4D] bg-[#FFF8F0] dark:bg-[#170A24] hover:bg-[#FFE5B4]/40 dark:hover:bg-[#2A153E] text-[#382A22] dark:text-[#FFE5B4] flex items-center justify-center transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#E88B60]"
    >
      {isDark ? (
        <Sun size={15} className="text-[#FFE5B4] transition-transform duration-300 rotate-0 hover:rotate-45" />
      ) : (
        <Moon size={15} className="text-[#382A22] transition-transform duration-300 rotate-0 hover:-rotate-12" />
      )}
    </button>
  );
}
