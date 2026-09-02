export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
export const USERNAME_REGEX = /^[a-z0-9_](?:[a-z0-9_.-]{1,18})[a-z0-9_]$/i;

export const RESERVED_USERNAMES = [
  "api",
  "inbox",
  "feed",
  "bottle",
  "about",
  "recover",
  "u",
  "admin",
  "chithi",
  "null",
  "undefined",
  "new",
  "help",
  "support",
  "report",
] as const;

export const LETTER_BODY_MIN = 1;
export const LETTER_BODY_MAX = 2000;

export const HINT_MAX_COUNT = 3;
export const HINT_MAX_LEN = 60;

export const RIDDLE_Q_MAX = 140;
export const RIDDLE_ANSWER_MIN = 1;
export const RIDDLE_ANSWER_MAX = 60;
export const RIDDLE_MAX_ATTEMPTS = 5;

export const CAPSULE_MIN_LEAD_MS = 60_000;
export const BURN_WINDOW_MS = 60_000;

export const MAILBOX_LETTER_CAP = 300;

export const FEED_PAGE_SIZE = 24;
export const INBOX_PAGE_SIZE = 20;

export const DURATIONS = {
  "12h": 43200,
  "24h": 86400,
  "3d": 259200,
  "7d": 604800,
} as const;

export const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000; // 604,800,000 ms
export const SEVEN_DAYS_SECONDS = 7 * 24 * 60 * 60; // 604,800 seconds

export const FEED_TTL_S = 172800; // 48 hours
export const MAX_JSON_BODY_BYTES = 16_384;
export const PASSCODE_LENGTH = 6;

export const MOTION = {
  ease: [0.22, 1, 0.36, 1] as const,
  duration: {
    fast: 0.18,
    base: 0.32,
    slow: 0.6,
    envelope: 0.9,
  },
  stagger: 0.05,
} as const;
