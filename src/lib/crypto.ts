import { createHash, timingSafeEqual as nodeTimingSafeEqual } from "crypto";
import { env } from "./env";

/**
 * SHA-256 hash formatted as hex string
 */
export function sha256(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/**
 * Timing-safe string equality comparison to prevent timing attacks.
 * Checks string lengths safely and performs crypto.timingSafeEqual on equal-length buffers.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");

  if (bufA.length !== bufB.length) {
    // Prevent short-circuit timing leak on length mismatch
    nodeTimingSafeEqual(bufA, bufA);
    return false;
  }

  return nodeTimingSafeEqual(bufA, bufB);
}

/**
 * Computes sha256(secret + AUTH_PEPPER)
 */
export function hashWithPepper(secret: string): string {
  return sha256(secret + env.AUTH_PEPPER);
}

/**
 * Normalises a riddle answer before comparison or hashing.
 * Pipeline: trim, collapse internal whitespace, toLocaleLowerCase, strip trailing ?!.।
 */
export function normaliseRiddleAnswer(answer: string): string {
  return answer
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase()
    .replace(/[?!.।\s]+$/, "");
}

/**
 * Hashes a normalised riddle answer with AUTH_PEPPER
 */
export function hashRiddleAnswer(answer: string): string {
  const normalised = normaliseRiddleAnswer(answer);
  return hashWithPepper(normalised);
}
