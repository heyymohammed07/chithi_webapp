"use client";

import React from "react";
import { motion } from "framer-motion";
import { Mail, Compass, Send, Feather, Sparkles } from "lucide-react";
import { useReducedMotionSafe } from "@/hooks/useReducedMotionSafe";

export interface PaperCutStampProps {
  label?: string;
  sublabel?: string;
  icon?: "mail" | "feather" | "compass" | "send";
  rotation?: number;
  className?: string;
  animate?: boolean;
}

/**
 * Paper-cut perforated postage stamp with vintage postal serrations,
 * smooth ambient floating, and interactive hover animations.
 */
export function PaperCutStamp({
  label = "CHITHI",
  sublabel = "পোস্ট",
  icon = "feather",
  rotation = -4,
  className = "",
  animate = true,
}: PaperCutStampProps) {
  const shouldReduceMotion = useReducedMotionSafe();
  const canAnimate = animate && !shouldReduceMotion;

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
      initial={canAnimate ? { y: 0, rotate: rotation } : undefined}
      animate={
        canAnimate
          ? {
              y: [0, -4, 0],
              rotate: [rotation, rotation + 1.5, rotation],
            }
          : undefined
      }
      transition={
        canAnimate
          ? {
              duration: 4.5,
              repeat: Infinity,
              ease: "easeInOut",
            }
          : undefined
      }
      whileHover={
        canAnimate
          ? {
              scale: 1.1,
              rotate: rotation + 5,
              y: -6,
              transition: { type: "spring", stiffness: 400, damping: 20 },
            }
          : undefined
      }
      whileTap={canAnimate ? { scale: 0.95 } : undefined}
      className={`inline-block p-2 rounded-sm bg-surface border-2 border-dashed border-wax/60 shadow-stationery select-none cursor-pointer transition-shadow hover:shadow-lg ${className}`}
      style={{ transformOrigin: "center center" }}
    >
      <div className="border border-edge p-2 bg-peach/30 rounded-xs flex flex-col items-center justify-center text-center min-w-[64px]">
        <div className="flex items-center justify-between w-full text-[8px] font-mono text-ink-muted tracking-widest px-0.5 mb-1">
          <span>{label}</span>
          <Sparkles size={8} className="text-wax" aria-hidden="true" />
        </div>

        <div className="w-8 h-8 rounded-full bg-peach border border-peach-hover flex items-center justify-center text-wax my-0.5 shadow-inner">
          <IconComponent size={14} strokeWidth={1.8} />
        </div>

        <span className="text-[9px] font-serif font-bold text-ink mt-1">
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
  animate?: boolean;
}

/**
 * Vintage circular postmark cancellation seal with subtle floating and hover stamp rotation.
 */
export function PostmarkSeal({
  city = "চিঠি · DAK GHAR",
  date = "AIR MAIL",
  rotation = 12,
  className = "",
  animate = true,
}: PostmarkSealProps) {
  const shouldReduceMotion = useReducedMotionSafe();
  const canAnimate = animate && !shouldReduceMotion;

  return (
    <motion.div
      initial={canAnimate ? { rotate: rotation, scale: 1 } : undefined}
      animate={
        canAnimate
          ? {
              rotate: [rotation, rotation - 2, rotation],
              scale: [1, 1.02, 1],
            }
          : undefined
      }
      transition={
        canAnimate
          ? {
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut",
            }
          : undefined
      }
      whileHover={
        canAnimate
          ? {
              scale: 1.15,
              rotate: rotation + 14,
              transition: { type: "spring", stiffness: 350, damping: 18 },
            }
          : undefined
      }
      whileTap={canAnimate ? { scale: 0.94 } : undefined}
      className={`relative inline-flex items-center gap-2 select-none cursor-pointer opacity-85 dark:opacity-95 hover:opacity-100 transition-opacity ${className}`}
      style={{ transformOrigin: "center center" }}
    >
      <div className="w-14 h-14 rounded-full border-2 border-dashed border-ink-muted flex flex-col items-center justify-center text-center p-1 bg-canvas/30 backdrop-blur-xs">
        <span className="text-[7px] font-mono uppercase tracking-widest text-ink-muted font-semibold leading-tight">
          {city}
        </span>
        <div className="w-full h-px bg-ink-muted/40 my-0.5" />
        <span className="text-[7px] font-mono uppercase tracking-wider text-wax font-bold">
          {date}
        </span>
      </div>

      {/* Wavy cancellation bars */}
      <div className="flex flex-col gap-1 w-8">
        <div className="h-0.5 w-full bg-ink-muted/40 rounded-full" />
        <div className="h-0.5 w-full bg-ink-muted/40 rounded-full" />
        <div className="h-0.5 w-full bg-ink-muted/40 rounded-full" />
      </div>
    </motion.div>
  );
}

export interface AirmailTapeProps {
  label?: string;
  sublabel?: string;
  rotation?: number;
  className?: string;
  animate?: boolean;
}

/**
 * Nostalgic Par Avion / Air Mail tape sticker with hover lift and tilt.
 */
export function AirmailTape({
  label = "PAR AVION",
  sublabel = "বিমান ডাক",
  rotation = -2,
  className = "",
  animate = true,
}: AirmailTapeProps) {
  const shouldReduceMotion = useReducedMotionSafe();
  const canAnimate = animate && !shouldReduceMotion;

  return (
    <motion.div
      initial={canAnimate ? { y: 0, rotate: rotation } : undefined}
      animate={
        canAnimate
          ? {
              y: [0, -3, 0],
              rotate: [rotation, rotation - 1, rotation],
            }
          : undefined
      }
      transition={
        canAnimate
          ? {
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }
          : undefined
      }
      whileHover={
        canAnimate
          ? {
              scale: 1.08,
              y: -5,
              rotate: rotation - 2,
              transition: { type: "spring", stiffness: 400, damping: 20 },
            }
          : undefined
      }
      whileTap={canAnimate ? { scale: 0.96 } : undefined}
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-sm bg-canvas border border-edge shadow-stationery select-none cursor-pointer transition-shadow hover:shadow-md ${className}`}
      style={{ transformOrigin: "center center" }}
    >
      <div className="w-2.5 h-4 bg-wax rounded-xs shadow-xs" />
      <div className="flex flex-col text-left">
        <span className="text-[9px] font-mono font-bold tracking-widest text-ink">
          {label}
        </span>
        <span className="text-[8px] font-serif text-ink-muted leading-none">
          {sublabel}
        </span>
      </div>
      <div className="w-2.5 h-4 bg-sky-400 rounded-xs shadow-xs ml-1" />
    </motion.div>
  );
}

export interface PaperScrapProps {
  text: string;
  rotation?: number;
  className?: string;
  animate?: boolean;
}

/**
 * Torn notebook paper scrap sticker with taped edge, ambient float, and hover tilt.
 */
export function PaperScrap({
  text,
  rotation = 3,
  className = "",
  animate = true,
}: PaperScrapProps) {
  const shouldReduceMotion = useReducedMotionSafe();
  const canAnimate = animate && !shouldReduceMotion;

  return (
    <motion.div
      initial={canAnimate ? { y: 0, rotate: rotation } : undefined}
      animate={
        canAnimate
          ? {
              y: [0, -3.5, 0],
              rotate: [rotation, rotation + 1.2, rotation],
            }
          : undefined
      }
      transition={
        canAnimate
          ? {
              duration: 5.5,
              repeat: Infinity,
              ease: "easeInOut",
            }
          : undefined
      }
      whileHover={
        canAnimate
          ? {
              scale: 1.08,
              y: -6,
              rotate: rotation + 4,
              transition: { type: "spring", stiffness: 380, damping: 19 },
            }
          : undefined
      }
      whileTap={canAnimate ? { scale: 0.96 } : undefined}
      className={`relative inline-block px-3.5 py-1.5 rounded-sm bg-peach/50 border border-edge shadow-stationery select-none cursor-pointer transition-shadow hover:shadow-lg ${className}`}
      style={{ transformOrigin: "center center" }}
    >
      {/* Tape piece across top edge */}
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-3.5 bg-warn-surface/60 border-y border-warn-edge shadow-xs pointer-events-none" />
      <span className="font-hand text-xs text-ink italic font-medium">
        {text}
      </span>
    </motion.div>
  );
}
