import sanitizeHtml from "sanitize-html";
import { LETTER_BODY_MAX } from "./constants";
import { ApiError } from "./types";

// Matches explicit schemes (http, https, ftp), protocol-relative (//), and www. hosts
const SCHEME_REGEX = /(?:https?:\/\/|ftp:\/\/|\/\/)[^\s]+|\bwww\.[a-zA-Z0-9-]+\.[^\s]+/gi;

// Matches bare domains with at least 2 labels, a curated TLD, and mandatory path/query/port
const BARE_DOMAIN_REGEX =
  /(^|[\s(\[{<])((?:[a-zA-Z0-9-]+\.)+(?:com|org|net|edu|gov|io|co|me|xyz|app|dev|link|info|live|site)(?:[:/?#][^\s]*))/gi;

/**
 * Strips URLs and replaces them with link removed placeholder (§COR-05).
 */
export function stripUrls(text: string, placeholder = "[link removed]"): string {
  let res = text.replace(SCHEME_REGEX, placeholder);
  res = res.replace(BARE_DOMAIN_REGEX, (_match, prefix) => prefix + placeholder);
  return res;
}

/**
 * Checks if any single word exceeds the maximum allowed length (spam guard).
 */
export function hasExcessivelyLongWord(text: string, maxWordLen = 60): boolean {
  const words = text.split(/\s+/);
  return words.some((word) => word.length > maxWordLen);
}

/**
 * Truncates text on a grapheme cluster boundary without splitting
 * composite characters, surrogate pairs, or Bengali conjuncts.
 */
export function truncateGraphemes(text: string, maxGraphemes: number): string {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    const segments = Array.from(segmenter.segment(text));
    if (segments.length <= maxGraphemes) return text;
    return segments.slice(0, maxGraphemes).map((s) => s.segment).join("");
  }
  return text.slice(0, maxGraphemes);
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

/**
 * Cleans, sanitizes, and normalises user input to pure plain text (§COR-04, §COR-05).
 * Strictly preserves Bengali ZWNJ (\u200C) and ZWJ (\u200D) while removing
 * zero-width, bidi overrides, control characters, and all HTML tags.
 */
export function toPlainText(
  input: string,
  maxChars = LETTER_BODY_MAX,
  placeholder = "[link removed]"
): string {
  if (typeof input !== "string") {
    throw new ApiError("VALIDATION_FAILED", "errors.validation.inputMustBeString", 400);
  }

  // Pre-screen enormous inputs to prevent ReDoS (§COR-04)
  if (input.length > maxChars * 5) {
    throw new ApiError("VALIDATION_FAILED", "errors.validation.payloadTooLarge", 400);
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

  // 5. Strip URLs from letter bodies/hints per §COR-05
  cleaned = stripUrls(cleaned, placeholder);

  // 6. Format whitespace: trim line endings, collapse >2 newlines to 2, trim ends
  cleaned = cleaned
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // 7. Enforce length cap AFTER sanitization (§COR-05)
  // Truncate on grapheme boundary if post-strip length exceeds maxChars
  if (countGraphemes(cleaned) > maxChars) {
    cleaned = truncateGraphemes(cleaned, maxChars);
  }

  return cleaned;
}

/**
 * Sanitizes sender names specifically: flattens and strips all newlines (\r, \n),
 * tabs, bidi override markers, and HTML tags (§COR-06).
 */
export function sanitizeSenderName(name: string, maxChars = 40): string {
  if (typeof name !== "string") return "";
  let cleaned = toPlainText(name, maxChars);
  cleaned = cleaned.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
  if (countGraphemes(cleaned) > maxChars) {
    cleaned = truncateGraphemes(cleaned, maxChars);
  }
  return cleaned;
}

