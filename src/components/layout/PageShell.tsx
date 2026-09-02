import React from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { ToastViewport } from "../ui/Toast";

export function PageShell({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="relative min-h-screen overflow-x-hidden flex flex-col bg-[#FAF7F2] dark:bg-[#0C0314] text-[#2D2522] dark:text-[#F5EBE6] transition-colors duration-200">
      {/* Skip link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#FFFDF9] focus:text-[#D9534F] focus:border focus:border-[#D9534F] focus:rounded-full shadow-sm"
      >
        Skip to content
      </a>

      <Header />

      <main
        id="main-content"
        className={`flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 md:py-12 ${className}`}
      >
        {children}
      </main>

      <Footer />
      <ToastViewport />
    </div>
  );
}
