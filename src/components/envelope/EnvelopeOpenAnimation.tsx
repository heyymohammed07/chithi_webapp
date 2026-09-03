"use client";

import React from "react";
import { motion } from "framer-motion";
import { WaxSeal } from "./WaxSeal";
import { MOTION } from "@/lib/constants";
import { useReducedMotionSafe } from "@/hooks/useReducedMotionSafe";

export interface EnvelopeOpenAnimationProps {
  isOpening: boolean;
  onAnimationComplete: () => void;
}

export function EnvelopeOpenAnimation({
  isOpening,
  onAnimationComplete,
}: EnvelopeOpenAnimationProps) {
  const shouldReduceMotion = useReducedMotionSafe();

  React.useEffect(() => {
    if (isOpening && shouldReduceMotion) {
      onAnimationComplete();
    }
  }, [isOpening, shouldReduceMotion, onAnimationComplete]);

  if (!isOpening || shouldReduceMotion) return null;

  // 0.9s 3D animation sequence (§11.4)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm pointer-events-none">
      <motion.div
        initial={{ y: 0, scale: 0.95 }}
        animate={{ y: -4, scale: 1 }}
        transition={{ duration: MOTION.duration.envelope, ease: MOTION.ease }}
        className="relative w-80 h-52 bg-ink-raised border border-ink-hairline rounded-envelope shadow-modal overflow-visible flex items-center justify-center"
        style={{ perspective: 1000 }}
      >
        {/* Flap rotating open 0 to -170deg */}
        <motion.div
          initial={{ rotateX: 0 }}
          animate={{ rotateX: -170 }}
          transition={{
            duration: MOTION.duration.envelope * 0.7,
            delay: 0.2,
            ease: MOTION.ease,
          }}
          style={{
            transformOrigin: "top center",
            transformStyle: "preserve-3d",
          }}
          className="absolute top-0 left-0 right-0 h-28 bg-ink border-b border-ink-hairline z-20"
        />

        {/* Wax seal cracking apart */}
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 0.2 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="relative z-30"
        >
          <WaxSeal isCracked size={52} />
        </motion.div>

        {/* Paper sliding up out of pocket */}
        <motion.div
          initial={{ y: "24%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{
            duration: 0.5,
            delay: 0.45,
            ease: MOTION.ease,
          }}
          onAnimationComplete={onAnimationComplete}
          className="absolute inset-x-4 top-4 bottom-4 bg-ivory dark:bg-surface-raised border border-ink-hairline rounded-envelope z-10"
        />
      </motion.div>
    </div>
  );
}
