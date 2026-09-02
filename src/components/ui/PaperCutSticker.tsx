"use client";

import React from "react";
import { motion } from "framer-motion";
import { Mail, Compass, Send, Feather } from "lucide-react";

export interface PaperCutStampProps {
  label?: string;
  sublabel?: string;
  icon?: "mail" | "feather" | "compass" | "send";
  rotation?: number;
  className?: string;
  animate?: boolean;
}

/**
 * Paper-cut perforated postage stamp with vintage postal serrations and shadow
 */
export function PaperCutStamp({
  label = "CHITHI",
  sublabel = "পোস্ট",
  icon = "feather",
  rotation = -4,
  className = "",
  animate = true,
}: PaperCutStampProps) {
  const IconComponent =
    icon === "mail"
      ? Mail
      : icon === "compass"
      ? Compass
      : icon === "send"
      ? Send
      : Feather;

  return (
    <motion.div
      initial={animate ? { y: 0, rotate: rotation } : undefined}
      animate={
        animate
          ? {
              y: [0, -3, 0],
              rotate: [rotation, rotation + 1, rotation],
            }
          : undefined
      }
      transition={
        animate
          ? {
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut",
            }
          : undefined
      }
      className={`inline-block p-2 rounded-sm bg-[#FFF8F0] dark:bg-[#1E0F2E] border-2 border-dashed border-[#E88B60]/60 dark:border-[#E88B60]/80 shadow-[0_8px_20px_-4px_rgba(70,48,32,0.12)] dark:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.7)] select-none pointer-events-none ${className}`}
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <div className="border border-[#F0E2D2] dark:border-[#351D4D] p-2 bg-[#FFE5B4]/30 dark:bg-[#2B143D]/50 rounded-xs flex flex-col items-center justify-center text-center min-w-[64px]">
        <div className="flex items-center justify-between w-full text-[8px] font-mono text-[#857367] dark:text-[#C5B3A6] tracking-widest px-0.5 mb-1">
          <span>{label}</span>
          <span className="font-bold text-[#E88B60]">★</span>
        </div>

        <div className="w-8 h-8 rounded-full bg-[#FFE5B4] border border-[#FCD34D] flex items-center justify-center text-[#E88B60] my-0.5 shadow-inner">
          <IconComponent size={14} strokeWidth={1.8} />
        </div>

        <span className="text-[9px] font-serif font-bold text-[#382A22] dark:text-[#FFF8F0] mt-1">
          {sublabel}
        </span>
      </div>
    </motion.div>
  );
}

export interface PostmarkSealProps {
  city?: string;
  date?: string;
  rotation?: number;
  className?: string;
}

/**
 * Vintage circular postmark cancellation seal
 */
export function PostmarkSeal({
  city = "চিঠি · DAK GHAR",
  date = "AIR MAIL",
  rotation = 12,
  className = "",
}: PostmarkSealProps) {
  return (
    <div
      className={`relative inline-flex items-center gap-2 select-none pointer-events-none opacity-75 dark:opacity-90 ${className}`}
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <div className="w-14 h-14 rounded-full border-2 border-dashed border-[#857367] dark:border-[#B5A2B6] flex flex-col items-center justify-center text-center p-1">
        <span className="text-[7px] font-mono uppercase tracking-widest text-[#857367] dark:text-[#C5B3A6] font-semibold leading-tight">
          {city}
        </span>
        <div className="w-full h-px bg-[#857367]/40 dark:bg-[#B5A2B6]/40 my-0.5" />
        <span className="text-[7px] font-mono uppercase tracking-wider text-[#E88B60] font-bold">
          {date}
        </span>
      </div>

      {/* Wavy cancellation bars */}
      <div className="flex flex-col gap-1 w-8">
        <div className="h-0.5 w-full bg-[#857367]/40 dark:bg-[#B5A2B6]/40 rounded-full" />
        <div className="h-0.5 w-full bg-[#857367]/40 dark:bg-[#B5A2B6]/40 rounded-full" />
        <div className="h-0.5 w-full bg-[#857367]/40 dark:bg-[#B5A2B6]/40 rounded-full" />
      </div>
    </div>
  );
}

export interface AirmailTapeProps {
  label?: string;
  sublabel?: string;
  rotation?: number;
  className?: string;
}

/**
 * Nostalgic Par Avion / Air Mail tape sticker
 */
export function AirmailTape({
  label = "PAR AVION",
  sublabel = "বিমান ডাক",
  rotation = -2,
  className = "",
}: AirmailTapeProps) {
  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-sm bg-[#FFFDF9] dark:bg-[#1A0B28] border border-[#F0E2D2] dark:border-[#351D4D] shadow-[0_4px_12px_-2px_rgba(70,48,32,0.08)] dark:shadow-[0_4px_16px_-2px_rgba(0,0,0,0.6)] select-none pointer-events-none ${className}`}
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <div className="w-2.5 h-4 bg-[#E88B60] rounded-xs shadow-xs" />
      <div className="flex flex-col text-left">
        <span className="text-[9px] font-mono font-bold tracking-widest text-[#382A22] dark:text-[#FFF8F0]">
          {label}
        </span>
        <span className="text-[8px] font-serif text-[#857367] dark:text-[#C5B3A6] leading-none">
          {sublabel}
        </span>
      </div>
      <div className="w-2.5 h-4 bg-[#60A5FA] rounded-xs shadow-xs ml-1" />
    </div>
  );
}

export interface PaperScrapProps {
  text: string;
  rotation?: number;
  className?: string;
}

/**
 * Torn notebook paper scrap sticker with taped edge
 */
export function PaperScrap({
  text,
  rotation = 3,
  className = "",
}: PaperScrapProps) {
  return (
    <div
      className={`relative inline-block px-3.5 py-1.5 rounded-sm bg-[#FFE5B4]/50 dark:bg-[#2B143D] border border-[#F0E2D2] dark:border-[#351D4D] shadow-[0_6px_16px_-4px_rgba(70,48,32,0.08)] dark:shadow-[0_6px_16px_-4px_rgba(0,0,0,0.6)] select-none pointer-events-none ${className}`}
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      {/* Tape piece across top edge */}
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-3.5 bg-[#FEF08A]/60 dark:bg-[#FEF08A]/30 backdrop-blur-xs border-y border-[#FDE68A]/80 dark:border-[#FDE68A]/40 shadow-xs" />
      <span className="font-hand text-xs text-[#382A22] dark:text-[#FFF8F0] italic font-medium">
        {text}
      </span>
    </div>
  );
}
