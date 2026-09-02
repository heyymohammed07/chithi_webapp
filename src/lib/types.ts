import { DURATIONS } from "./constants";

export type DurationKey = keyof typeof DURATIONS;

export type Gender = "male" | "female" | "other" | "unspecified";

export type PaperStyleId =
  | "parchment"
  | "midnight"
  | "rose"
  | "typewriter"
  | "rainy";

export type StampId = "wax" | "topSecret" | "memory" | "heartbreak";

export type FontId =
  | "handwriting1"
  | "handwriting2"
  | "handwriting3"
  | "typewriter"
  | "serif"
  | "casual"
  | "calligraphy"
  | "pencil";

export interface MailboxRecord {
  name?: string;
  username: string;
  usernameLower: string;
  accessTokenHash: string;
  gender: Gender;
  acceptsBottles: boolean;
  createdAt: number;
  lastLoginAt: number;
  expiresAt: number;
  durationKey: DurationKey;
  letterCount: number;
  version: 1;
}

export type LetterLock =
  | { kind: "none" }
  | { kind: "capsule"; unlockAt: number }
  | {
      kind: "riddle";
      question: string;
      answerHash: string;
      attempts: number;
      solvedAt: number | null;
    };

export interface LetterRecord {
  id: string;
  recipient: string;
  body: string;
  paper: PaperStyleId;
  stamp: StampId;
  hints: string[];
  source: "direct" | "bottle";
  createdAt: number;
  lock: LetterLock;
  burnAfterReading: boolean;
  openedAt: number | null;
  burnAt: number | null;
  reaction: "heart" | "heartCrack" | null;
  published: boolean;
  attachedSong?: import("./music").AttachedSong;
  senderName?: string | null;
  version: 1;
}

export interface FeedRecord {
  id: string;
  body: string;
  paper: PaperStyleId;
  stamp: StampId;
  createdAt: number;
  hearts: number;
  heartCracks: number;
  version: 1;
}

export interface LetterSummary {
  id: string;
  stamp: StampId;
  paper: PaperStyleId;
  createdAt: number;
  source: "direct" | "bottle";
  hasHints: boolean;
  hintCount: number;
  lockKind: "none" | "capsule" | "riddle";
  unlockAt?: number;
  isOpened: boolean;
  burnAt: number | null;
  burnAfterReading: boolean;
  reaction: "heart" | "heartCrack" | null;
  published: boolean;
  attachedSong?: import("./music").AttachedSong;
  senderName?: string | null;
}

export type ErrorCode =
  | "VALIDATION_FAILED"
  | "PAYLOAD_TOO_LARGE"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "GONE"
  | "LOCKED"
  | "WRONG_ANSWER"
  | "ATTEMPTS_EXCEEDED"
  | "USERNAME_TAKEN"
  | "MAILBOX_FULL"
  | "BOTTLE_NO_MATCH"
  | "ALREADY_DONE"
  | "RATE_LIMITED"
  | "INTERNAL";

export interface ApiOk<T> {
  ok: true;
  data: T;
}

export interface ApiErr {
  ok: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, string[]>;
  };
}

export type ApiResponse<T> = ApiOk<T> | ApiErr;

export type Locale = "en" | "bn";
