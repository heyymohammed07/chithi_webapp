import { SendLetterInput } from "./schemas";
import { LetterRecord, LetterSummary, MailboxRecord, PaperStyleId, StampId } from "./types";
import {
  CAPSULE_MIN_LEAD_MS,
  BURN_WINDOW_MS,
  MAILBOX_LETTER_CAP,
  RIDDLE_MAX_ATTEMPTS,
  SEVEN_DAYS_MS,
} from "./constants";
import { keys } from "./keys";
import { getRedis } from "./redis";
import { generateLetterId } from "./ids";
import { toPlainText, hasExcessivelyLongWord } from "./sanitize";
import { hashRiddleAnswer, timingSafeEqual, sha256 } from "./crypto";
import { ApiError } from "./api";
import { purgeInactiveMailbox } from "./mailbox";
import { publishDirectToFeed } from "./feed";

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
  const lastActive = mailbox.lastLoginAt ?? mailbox.createdAt;
  if (now - lastActive > SEVEN_DAYS_MS) {
    await purgeInactiveMailbox(recipientLower);
    throw new ApiError("GONE", "errors.mailboxExpired", 410);
  }

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

  // 6. Clamp letter TTL to mailbox lifetime
  const remainingSeconds = Math.max(1, Math.floor((mailbox.expiresAt - now) / 1000));
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
    attachedSong: input.attachedSong,
    senderName: input.isAnonymous ? null : (input.senderName?.trim() || null),
    version: 1,
  };

  // 7. Write in pipeline
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
  pipeline.set(floodKey, bodyHash, { ex: 600 }); // 10m flood guard
  await pipeline.exec();

  // If user opted into Benami Kham (Public Wall), publish feed item
  if (input.isPublic) {
    try {
      await publishDirectToFeed(cleanBody, input.paper as PaperStyleId, input.stamp as StampId);
    } catch (err) {
      console.warn("[sendLetter] Failed to publish public feed item", err);
    }
  }

  return { id: letterId };
}

export async function listLetters(usernameLower: string): Promise<LetterSummary[]> {
  const redis = getRedis();

  // 1. Read all letter IDs in reverse chronological order
  const letterIds: string[] =
    typeof redis.zrange === "function"
      ? await redis.zrange(keys.mailboxLetters(usernameLower), 0, -1, { rev: true })
      : await redis.zrevrange(keys.mailboxLetters(usernameLower), 0, -1);
  if (!letterIds || letterIds.length === 0) {
    return [];
  }

  // 2. MGET letter bodies
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

    // Check if letter burned out mid-session
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
      isOpened: letter.openedAt !== null,
      burnAt: letter.burnAt,
      burnAfterReading: letter.burnAfterReading,
      reaction: letter.reaction,
      published: letter.published,
      attachedSong: letter.attachedSong,
      senderName: letter.senderName,
    });
  }

  // 3. Prune ghost members in background
  if (ghostIds.length > 0) {
    const pipeline = redis.pipeline();
    pipeline.zrem(keys.mailboxLetters(usernameLower), ...ghostIds);
    for (const gid of ghostIds) {
      pipeline.del(keys.letter(gid));
    }
    pipeline.exec().catch((err) => console.error("Ghost pruning error:", err));
  }

  return summaries;
}

export async function getLetter(
  usernameLower: string,
  letterId: string
): Promise<Omit<LetterRecord, "lock"> & { lock: LetterRecord["lock"] extends { answerHash: string } ? Omit<LetterRecord["lock"], "answerHash"> : LetterRecord["lock"] }> {
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

  // Burn check
  if (letter.burnAt !== null && now > letter.burnAt) {
    await redis.del(keys.letter(letterId));
    await redis.zrem(keys.mailboxLetters(usernameLower), letterId);
    throw new ApiError("GONE", "errors.letterBurned", 410);
  }

  // Capsule lock check
  if (letter.lock.kind === "capsule" && now < letter.lock.unlockAt) {
    throw new ApiError("LOCKED", "errors.letterLockedCapsule", 423, {
      unlockAt: [String(letter.lock.unlockAt)],
    });
  }

  // Riddle lock check
  if (letter.lock.kind === "riddle" && letter.lock.solvedAt === null) {
    const attemptsLeft = Math.max(0, RIDDLE_MAX_ATTEMPTS - letter.lock.attempts);
    throw new ApiError("LOCKED", "errors.letterLockedRiddle", 423, {
      question: [letter.lock.question],
      attemptsLeft: [String(attemptsLeft)],
    });
  }

  // First open handling (atomic update)
  let needsSave = false;
  if (letter.openedAt === null) {
    letter.openedAt = now;
    needsSave = true;

    if (letter.burnAfterReading) {
      letter.burnAt = now + BURN_WINDOW_MS;
      // Shorten Redis TTL to 60s
      await redis.expire(keys.letter(letterId), 60);
    }

    // Decrement unread counter clamped to 0
    await redis.decr(keys.mailboxUnread(usernameLower));
  }

  if (needsSave) {
    const ttl = await redis.ttl(keys.letter(letterId));
    if (ttl > 0) {
      await redis.set(keys.letter(letterId), JSON.stringify(letter), { ex: ttl });
    }
  }

  // Strip answerHash from returned object
  const safeLetter = { ...letter };
  if (safeLetter.lock.kind === "riddle") {
    const { answerHash: _, ...safeRiddle } = safeLetter.lock;
    safeLetter.lock = safeRiddle as typeof safeLetter.lock;
  }

  return safeLetter as any;
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

  if (letter.lock.solvedAt !== null) {
    return { solved: true, body: letter.body };
  }

  if (letter.lock.attempts >= RIDDLE_MAX_ATTEMPTS) {
    throw new ApiError("ATTEMPTS_EXCEEDED", "errors.riddleAttemptsExceeded", 423);
  }

  const incomingHash = hashRiddleAnswer(answer);
  const isMatch = timingSafeEqual(incomingHash, letter.lock.answerHash);

  const ttl = Math.max(1, await redis.ttl(keys.letter(letterId)));

  if (!isMatch) {
    letter.lock.attempts += 1;
    await redis.set(keys.letter(letterId), JSON.stringify(letter), { ex: ttl });

    const attemptsRemaining = RIDDLE_MAX_ATTEMPTS - letter.lock.attempts;
    if (attemptsRemaining <= 0) {
      throw new ApiError("ATTEMPTS_EXCEEDED", "errors.riddleAttemptsExceeded", 423);
    }

    throw new ApiError("WRONG_ANSWER", "errors.riddleWrongAnswer", 422, {
      attemptsRemaining: [String(attemptsRemaining)],
    });
  }

  // Riddle solved!
  letter.lock.solvedAt = Date.now();

  const now = Date.now();
  if (letter.openedAt === null) {
    letter.openedAt = now;
    if (letter.burnAfterReading) {
      letter.burnAt = now + BURN_WINDOW_MS;
      await redis.expire(keys.letter(letterId), 60);
    }
    await redis.decr(keys.mailboxUnread(usernameLower));
  }

  await redis.set(keys.letter(letterId), JSON.stringify(letter), { ex: ttl });

  return { solved: true, body: letter.body };
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

    if (letter.openedAt === null) {
      await redis.decr(keys.mailboxUnread(usernameLower));
    }
  }

  await redis.del(keys.letter(letterId));
  await redis.zrem(keys.mailboxLetters(usernameLower), letterId);

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

  letter.reaction = reaction;
  const ttl = Math.max(1, await redis.ttl(keys.letter(letterId)));
  await redis.set(keys.letter(letterId), JSON.stringify(letter), { ex: ttl });
  await redis.hincrby(keys.letterReactions(letterId), reaction, 1);

  return { reaction };
}
