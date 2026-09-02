"use client";

import { useReducedMotion } from "framer-motion";

/**
 * Returns true if the user has requested reduced motion in their OS or browser settings.
 * Safe for SSR and hydration.
 */
export function useReducedMotionSafe(): boolean {
  const shouldReduce = useReducedMotion();
  return Boolean(shouldReduce);
}
