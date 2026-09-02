import sanitizeHtml from "sanitize-html";
import { LETTER_BODY_MAX } from "./constants";

/**
 * Strips URLs and replaces them with [link removed] token.
 */
export function stripUrls(text: string): string {
  // Matches https?://..., ftp://..., www...., and common tld patterns like domain.com/path
  const urlRegex =
    /(?:https?:\/\/|ftp:\/\/|www\.)[^\s/$.?#].[^\s]*|(?:[a-zA-Z0-9-]+\.)+(?:com|org|net|edu|gov|io|co|me|xyz|app|dev|link|info|live|site)(?:\/[^\s]*)?/gi;

  return text.replace(urlRegex, "[link removed]");
}

/**
 * Checks if any single word exceeds the maximum allowed length (spam guard).
 */
export function hasExcessivelyLongWord(text: string, maxWordLen = 60): boolean {
  const words = text.split(/\s+/);
  return words.some((word) => word.length > maxWordLen);
}

/**
 * Cleans, sanitizes, and normalises user input to pure plain text.
 * Strictly preserves Bengali ZWNJ (\u200C) and ZWJ (\u200D) while removing
 * zero-width, bidi overrides, control characters, and all HTML tags.
 */
export function toPlainText(input: string, maxChars = LETTER_BODY_MAX): string {
  if (typeof input !== "string") {
    throw new Error("Input must be a string");
  }

  // Pre-screen enormous inputs to prevent ReDoS
  if (input.length > maxChars * 5) {
    throw new Error("Input payload too large");
  }

  // 1. Unicode normalise NFC
  let cleaned = input.normalize("NFC");

  // 2. Strip control characters except \n and \t
  cleaned = cleaned.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");

  // 3. Strip zero-width & bidi-override characters, EXPLICITLY PRESERVING \u200C (ZWNJ) and \u200D (ZWJ)
  cleaned = cleaned.replace(
    /[\u200B\u200E\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g,
    ""
  );

  // 4. Decode HTML entities and strip all markup to literal text
  cleaned = sanitizeHtml(cleaned, {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: "discard",
  });

  // 5. Strip URLs from letter bodies/hints per §10.3
  cleaned = stripUrls(cleaned);

  // 6. Format whitespace: trim line endings, collapse >2 newlines to 2, trim ends
  cleaned = cleaned
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // 7. Enforce length cap AFTER sanitization
  if (cleaned.length > maxChars) {
    throw new Error(`Text exceeds maximum allowed length of ${maxChars} characters`);
  }

  return cleaned;
}

/**
 * Counts grapheme clusters (aware of Bengali conjuncts and composite characters)
 */
export function countGraphemes(text: string): number {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return Array.from(segmenter.segment(text)).length;
  }
  return text.length;
}
