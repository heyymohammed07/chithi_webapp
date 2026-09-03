import { SendLetterInput } from "./schemas";
import {
  LetterRecord,
  LetterSummary,
  MailboxRecord,
  PaperStyleId,
  StampId,
  OpenLetter,
  LetterView,
} from "./types";
import {
  CAPSULE_MIN_LEAD_MS,
  BURN_WINDOW_MS,
  MAILBOX_LETTER_CAP,
  RIDDLE_MAX_ATTEMPTS,
  INBOX_PAGE_SIZE,
} from "./constants";
import { keys } from "./keys";
import { getRedis } from "./redis";
import { generateLetterId } from "./ids";
import { toPlainText, hasExcessivelyLongWord, sanitizeSenderName } from "./sanitize";
import { hashRiddleAnswer, sha256 } from "./crypto";
import { ApiError } from "./api";
import { getMailbox, remainingTtlSeconds } from "./mailbox";
import {
  OPEN_LETTER_SCRIPT,
  SOLVE_RIDDLE_SCRIPT,
  DELETE_LETTER_SCRIPT,
  SET_REACTION_SCRIPT,
} from "./scripts";

async function letterTtlSeconds(letter: LetterRecord): Promise<number> {
  const mailbox = await getMailbox(letter.recipient);
  if (!mailbox) throw new ApiError("GONE", "errors.mailboxExpired", 410);
  return remainingTtlSeconds(mailbox);
}

export async function sendLetter(
  input: SendLetterInput,
  viewerHash: string
): Promise<{ id: string }> {
  const redis = getRedis();
  const recipientLower = input.recipient.toLowerCase();

  // 1. Verify recipient mailbox exists and is alive
  const rawMailbox = await redis.get<string | MailboxRecord>(keys.mailbox(recipientLower));
  if (!rawMailbox) {
    throw new ApiError("NOT_FOUND", "errors.mailboxNotFound", 404);
  }

  const mailbox: MailboxRecord =
    typeof rawMailbox === "string" ? JSON.parse(rawMailbox) : rawMailbox;

  const now = Date.now();

  if (now > mailbox.expiresAt) {
    throw new ApiError("GONE", "errors.mailboxExpired", 410);
  }

  // 2. Enforce mailbox letter cap
  const currentCount = await redis.zcard(keys.mailboxLetters(recipientLower));
  if (currentCount >= MAILBOX_LETTER_CAP) {
    throw new ApiError("MAILBOX_FULL", "errors.mailboxFull", 409);
  }

  // 3. Flood guard check (§10.3)
  const bodyHash = sha256(input.body);
  const floodKey = keys.floodGuard(viewerHash, recipientLower);
  const recentHash = await redis.get<string>(floodKey);
  if (recentHash === bodyHash) {
    throw new ApiError("RATE_LIMITED", "errors.duplicateLetterFlood", 429);
  }

  // 4. Sanitize body and hints
  if (hasExcessivelyLongWord(input.body)) {
    throw new ApiError("VALIDATION_FAILED", "errors.validation.wordTooLong", 400);
  }
  const cleanBody = toPlainText(input.body);

  const cleanHints: string[] = [];
  if (input.hints) {
    for (const h of input.hints) {
      if (h && h.trim().length > 0) {
        if (hasExcessivelyLongWord(h)) {
          throw new ApiError("VALIDATION_FAILED", "errors.validation.wordTooLong", 400);
        }
        cleanHints.push(toPlainText(h, 60));
      }
    }
  }

  // 5. Validate & configure locks
  let lockRecord: LetterRecord["lock"] = { kind: "none" };

  if (input.mode.kind === "capsule") {
    const { unlockAt } = input.mode;
    if (unlockAt < now + CAPSULE_MIN_LEAD_MS) {
      throw new ApiError("VALIDATION_FAILED", "errors.capsuleLeadTooShort", 400);
    }
    if (unlockAt > mailbox.expiresAt) {
      throw new ApiError("VALIDATION_FAILED", "errors.capsulePastMailboxExpiry", 400);
    }
    lockRecord = { kind: "capsule", unlockAt };
  } else if (input.mode.kind === "riddle") {
    const { question, answer } = input.mode;
    const cleanQ = toPlainText(question, 140);
    const answerHash = hashRiddleAnswer(answer);
    lockRecord = {
      kind: "riddle",
      question: cleanQ,
      answerHash,
      attempts: 0,
      solvedAt: null,
    };
  }

  // 6. Letter ID and record
  const letterId = generateLetterId();

  const letterRecord: LetterRecord = {
    id: letterId,
    recipient: recipientLower,
    body: cleanBody,
    paper: input.paper as PaperStyleId,
    stamp: input.stamp as StampId,
    hints: cleanHints,
    source: "direct",
    createdAt: now,
    lock: lockRecord,
    burnAfterReading: Boolean(input.burnAfterReading),
    openedAt: null,
    burnAt: null,
    reaction: null,
    published: false,
    senderName: input.isAnonymous ? null : (sanitizeSenderName(input.senderName ?? "", 40) || null),
    version: 1,
  };

  const remainingSeconds = await remainingTtlSeconds(mailbox);

  const pipeline = redis.pipeline();
  pipeline.set(keys.letter(letterId), JSON.stringify(letterRecord), {
    ex: remainingSeconds,
  });
  pipeline.zadd(keys.mailboxLetters(recipientLower), {
    score: now,
    member: letterId,
  });
  pipeline.expire(keys.mailboxLetters(recipientLower), remainingSeconds);
  pipeline.incr(keys.mailboxUnread(recipientLower));
  pipeline.set(floodKey, bodyHash, { ex: 600 });
  await pipeline.exec();

  return { id: letterId };
}

export async function listLetters(
  usernameLower: string,
  cursor: number = 0
): Promise<{ items: LetterSummary[]; nextCursor: number | null }> {
  const redis = getRedis();

  const start = Math.max(0, cursor);
  const stop = start + INBOX_PAGE_SIZE - 1;

  const letterIds: string[] = await redis.zrange(
    keys.mailboxLetters(usernameLower),
    start,
    stop,
    { rev: true }
  );

  if (!letterIds || letterIds.length === 0) {
    return { items: [], nextCursor: null };
  }

  const letterKeys = letterIds.map((id) => keys.letter(id));
  const rawLetters = await redis.mget<unknown[]>(...letterKeys);

  const summaries: LetterSummary[] = [];
  const ghostIds: string[] = [];
  const now = Date.now();

  for (let i = 0; i < letterIds.length; i++) {
    const id = letterIds[i];
    const raw = rawLetters[i];

    if (!id || !raw) {
      if (id) ghostIds.push(id);
      continue;
    }

    let letter: LetterRecord;
    try {
      letter = typeof raw === "string" ? JSON.parse(raw) : (raw as LetterRecord);
    } catch {
      if (id) ghostIds.push(id);
      continue;
    }

    if (letter.burnAt !== null && now > letter.burnAt) {
      ghostIds.push(id);
      continue;
    }

    summaries.push({
      id: letter.id,
      stamp: letter.stamp,
      paper: letter.paper,
      createdAt: letter.createdAt,
      source: letter.source,
      hasHints: letter.hints.length > 0,
      hintCount: letter.hints.length,
      lockKind: letter.lock.kind,
      unlockAt: letter.lock.kind === "capsule" ? letter.lock.unlockAt : undefined,
      question: letter.lock.kind === "riddle" ? letter.lock.question : undefined,
      attemptsRemaining:
        letter.lock.kind === "riddle"
          ? Math.max(0, RIDDLE_MAX_ATTEMPTS - letter.lock.attempts)
          : undefined,
      isOpened: letter.openedAt !== null,
      burnAt: letter.burnAt,
      burnAfterReading: letter.burnAfterReading,
      reaction: letter.reaction,
      published: letter.published,
      senderName: letter.senderName,
    });
  }

  // Ghost-prune on the fetched slice only (§PERF-04)
  if (ghostIds.length > 0) {
    const pipeline = redis.pipeline();
    pipeline.zrem(keys.mailboxLetters(usernameLower), ...ghostIds);
    for (const gid of ghostIds) {
      pipeline.del(keys.letter(gid));
    }
    pipeline.exec().catch((err) => console.error("Ghost pruning error:", err));
  }

  const nextCursor = letterIds.length === INBOX_PAGE_SIZE ? start + INBOX_PAGE_SIZE : null;

  // Self-healing: if on first page and all letters fit, unread counter can be safely reconciled
  if (start === 0 && nextCursor === null) {
    const trueUnreadCount = summaries.filter((s) => !s.isOpened).length;
    const mailbox = await getMailbox(usernameLower);
    if (mailbox) {
      const ttl = remainingTtlSeconds(mailbox);
      await redis.set(keys.mailboxUnread(usernameLower), trueUnreadCount, { ex: ttl });
    }
  }

  return { items: summaries, nextCursor };
}

export async function getLetter(
  usernameLower: string,
  letterId: string
): Promise<LetterView> {
  const redis = getRedis();
  const raw = await redis.get<string | LetterRecord>(keys.letter(letterId));

  if (!raw) {
    throw new ApiError("NOT_FOUND", "errors.letterNotFound", 404);
  }

  const letter: LetterRecord = typeof raw === "string" ? JSON.parse(raw) : raw;

  if (letter.recipient !== usernameLower) {
    throw new ApiError("FORBIDDEN", "errors.forbidden", 403);
  }

  const now = Date.now();

  if (letter.burnAt !== null && now > letter.burnAt) {
    await redis.del(keys.letter(letterId));
    await redis.zrem(keys.mailboxLetters(usernameLower), letterId);
    throw new ApiError("GONE", "errors.letterBurned", 410);
  }

  const baseSummary: LetterSummary = {
    id: letter.id,
    stamp: letter.stamp,
    paper: letter.paper,
    createdAt: letter.createdAt,
    source: letter.source,
    hasHints: letter.hints.length > 0,
    hintCount: letter.hints.length,
    lockKind: letter.lock.kind,
    unlockAt: letter.lock.kind === "capsule" ? letter.lock.unlockAt : undefined,
    question: letter.lock.kind === "riddle" ? letter.lock.question : undefined,
    attemptsRemaining:
      letter.lock.kind === "riddle"
        ? Math.max(0, RIDDLE_MAX_ATTEMPTS - letter.lock.attempts)
        : undefined,
    isOpened: letter.openedAt !== null,
    burnAt: letter.burnAt,
    burnAfterReading: letter.burnAfterReading,
    reaction: letter.reaction,
    published: letter.published,
    senderName: letter.senderName,
  };

  if (letter.lock.kind === "capsule" && now < letter.lock.unlockAt) {
    return { state: "locked", summary: baseSummary };
  }

  if (letter.lock.kind === "riddle" && !letter.lock.solvedAt) {
    return { state: "locked", summary: baseSummary };
  }

  const ttl = await letterTtlSeconds(letter);
  const updatedRaw = await redis.eval<string | null>(
    OPEN_LETTER_SCRIPT,
    [keys.letter(letterId), keys.mailboxUnread(usernameLower)],
    [now, BURN_WINDOW_MS, ttl]
  );

  const updatedLetter: LetterRecord = updatedRaw
    ? typeof updatedRaw === "string"
      ? JSON.parse(updatedRaw)
      : updatedRaw
    : letter;

  const openLetter: OpenLetter = {
    id: updatedLetter.id,
    recipient: updatedLetter.recipient,
    body: updatedLetter.body,
    paper: updatedLetter.paper,
    stamp: updatedLetter.stamp,
    hints: updatedLetter.hints,
    source: updatedLetter.source,
    createdAt: updatedLetter.createdAt,
    lock:
      updatedLetter.lock.kind === "riddle"
        ? {
            kind: "riddle",
            question: updatedLetter.lock.question,
            attempts: updatedLetter.lock.attempts,
            solvedAt: updatedLetter.lock.solvedAt,
          }
        : updatedLetter.lock,
    burnAfterReading: updatedLetter.burnAfterReading,
    openedAt: updatedLetter.openedAt ?? now,
    burnAt: updatedLetter.burnAt,
    reaction: updatedLetter.reaction,
    published: updatedLetter.published,
    senderName: updatedLetter.senderName,
    version: 1,
  };

  return { state: "open", letter: openLetter };
}

export async function unlockLetter(
  usernameLower: string,
  letterId: string,
  answer: string
): Promise<{ solved: boolean; body: string }> {
  const redis = getRedis();
  const raw = await redis.get<string | LetterRecord>(keys.letter(letterId));

  if (!raw) {
    throw new ApiError("NOT_FOUND", "errors.letterNotFound", 404);
  }

  const letter: LetterRecord = typeof raw === "string" ? JSON.parse(raw) : raw;

  if (letter.recipient !== usernameLower) {
    throw new ApiError("FORBIDDEN", "errors.forbidden", 403);
  }

  if (letter.lock.kind !== "riddle") {
    return { solved: true, body: letter.body };
  }

  if (typeof letter.lock.solvedAt === "number" && letter.lock.solvedAt > 0) {
    return { solved: true, body: letter.body };
  }

  if (letter.lock.attempts >= RIDDLE_MAX_ATTEMPTS) {
    throw new ApiError("ATTEMPTS_EXCEEDED", "errors.riddleAttemptsExceeded", 423);
  }

  const incomingHash = hashRiddleAnswer(answer);
  const now = Date.now();
  const ttl = await letterTtlSeconds(letter);

  const resRaw = await redis.eval<string>(
    SOLVE_RIDDLE_SCRIPT,
    [keys.letter(letterId), keys.mailboxUnread(usernameLower)],
    [incomingHash, now, RIDDLE_MAX_ATTEMPTS, BURN_WINDOW_MS, ttl]
  );

  const res = typeof resRaw === "string" ? JSON.parse(resRaw) : resRaw;

  if (res.status === "NOT_FOUND") {
    throw new ApiError("NOT_FOUND", "errors.letterNotFound", 404);
  }
  if (res.status === "ATTEMPTS_EXCEEDED") {
    throw new ApiError("ATTEMPTS_EXCEEDED", "errors.riddleAttemptsExceeded", 423);
  }
  if (res.status === "WRONG_ANSWER") {
    throw new ApiError("WRONG_ANSWER", "errors.riddleWrongAnswer", 422, {
      attemptsRemaining: [String(res.attemptsRemaining)],
    });
  }

  return { solved: true, body: res.body };
}

export async function deleteLetter(
  usernameLower: string,
  letterId: string
): Promise<{ deleted: true }> {
  const redis = getRedis();
  const raw = await redis.get<string | LetterRecord>(keys.letter(letterId));

  if (raw) {
    const letter: LetterRecord = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (letter.recipient !== usernameLower) {
      throw new ApiError("FORBIDDEN", "errors.forbidden", 403);
    }
  }

  await redis.eval<number>(
    DELETE_LETTER_SCRIPT,
    [
      keys.letter(letterId),
      keys.mailboxLetters(usernameLower),
      keys.mailboxUnread(usernameLower),
      keys.letterReactions(letterId),
    ],
    [letterId]
  );

  return { deleted: true };
}

export async function reactToLetter(
  usernameLower: string,
  letterId: string,
  reaction: "heart" | "heartCrack"
): Promise<{ reaction: "heart" | "heartCrack" }> {
  const redis = getRedis();
  const raw = await redis.get<string | LetterRecord>(keys.letter(letterId));

  if (!raw) {
    throw new ApiError("NOT_FOUND", "errors.letterNotFound", 404);
  }

  const letter: LetterRecord = typeof raw === "string" ? JSON.parse(raw) : raw;

  if (letter.recipient !== usernameLower) {
    throw new ApiError("FORBIDDEN", "errors.forbidden", 403);
  }

  const ttl =
    letter.burnAfterReading && letter.burnAt !== null
      ? Math.max(1, Math.ceil((letter.burnAt - Date.now()) / 1000))
      : await letterTtlSeconds(letter);

  const res = await redis.eval<number>(
    SET_REACTION_SCRIPT,
    [keys.letter(letterId), keys.letterReactions(letterId)],
    [reaction, ttl]
  );

  if (res === 0) {
    throw new ApiError("NOT_FOUND", "errors.letterNotFound", 404);
  }

  return { reaction };
}
