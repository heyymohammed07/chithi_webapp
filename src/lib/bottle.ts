import { SendBottleInput } from "./schemas";
import { MailboxRecord, LetterRecord, PaperStyleId, StampId } from "./types";
import { MAILBOX_LETTER_CAP, SEVEN_DAYS_MS } from "./constants";
import { keys } from "./keys";
import { getRedis } from "./redis";
import { generateLetterId } from "./ids";
import { toPlainText, hasExcessivelyLongWord } from "./sanitize";
import { ApiError } from "./api";
import { purgeInactiveMailbox } from "./mailbox";

/**
 * Matches an active, eligible mailbox recipient for a Message in a Bottle.
 */
export async function selectBottleRecipient(
  target: "anyone" | "male" | "female",
  senderViewerHash: string,
  senderUsernameLower?: string
): Promise<string> {
  const redis = getRedis();
  const poolKey =
    target === "anyone"
      ? keys.bottlePool("any")
      : keys.bottlePool(target);

  const now = Date.now();

  // 1. Prune expired mailboxes from pool
  await redis.zremrangebyscore(poolKey, 0, now);

  // 2. Count active candidates
  const card = await redis.zcard(poolKey);
  if (card === 0) {
    throw new ApiError("BOTTLE_NO_MATCH", "errors.bottleNoMatch", 409);
  }

  // 3. Retry matching up to 5 times
  for (let attempt = 0; attempt < 5; attempt++) {
    const randomIndex = Math.floor(Math.random() * card);
    const candidateArray = await redis.zrange(poolKey, randomIndex, randomIndex);
    const candidate = candidateArray[0];

    if (!candidate) continue;

    // Reject self-targeting
    if (senderUsernameLower && candidate === senderUsernameLower) {
      continue;
    }

    // Verify mailbox exists and is active
    const rawMailbox = await redis.get<string | MailboxRecord>(keys.mailbox(candidate));
    if (!rawMailbox) {
      await redis.zrem(poolKey, candidate);
      continue;
    }

    const mailbox: MailboxRecord =
      typeof rawMailbox === "string" ? JSON.parse(rawMailbox) : rawMailbox;

    const lastActive = mailbox.lastLoginAt ?? mailbox.createdAt;
    if (now - lastActive > SEVEN_DAYS_MS) {
      await purgeInactiveMailbox(candidate);
      await redis.zrem(poolKey, candidate);
      continue;
    }

    if (now > mailbox.expiresAt || !mailbox.acceptsBottles) {
      await redis.zrem(poolKey, candidate);
      continue;
    }

    // Check letter cap
    const letterCount = await redis.zcard(keys.mailboxLetters(candidate));
    if (letterCount >= MAILBOX_LETTER_CAP) {
      continue;
    }

    // 24h pair delivery guard (§12)
    const pairKey = keys.bottlePair(senderViewerHash, candidate);
    const acquired = await redis.set(pairKey, "1", { nx: true, ex: 86400 });
    if (!acquired) {
      continue;
    }

    return candidate;
  }

  throw new ApiError("BOTTLE_NO_MATCH", "errors.bottleNoMatch", 409);
}

/**
 * Sends an anonymous message in a bottle.
 */
export async function sendBottle(
  input: SendBottleInput,
  senderViewerHash: string,
  senderUsernameLower?: string
): Promise<{ delivered: true }> {
  const redis = getRedis();

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

  // Find random matching recipient
  const recipient = await selectBottleRecipient(
    input.target,
    senderViewerHash,
    senderUsernameLower
  );

  const rawMailbox = await redis.get<string | MailboxRecord>(keys.mailbox(recipient));
  if (!rawMailbox) {
    throw new ApiError("BOTTLE_NO_MATCH", "errors.bottleNoMatch", 409);
  }

  const mailbox: MailboxRecord =
    typeof rawMailbox === "string" ? JSON.parse(rawMailbox) : rawMailbox;

  const now = Date.now();
  const remainingSeconds = Math.max(1, Math.floor((mailbox.expiresAt - now) / 1000));
  const letterId = generateLetterId();

  // Bottle letters never have riddle or capsule locks per §12
  const letterRecord: LetterRecord = {
    id: letterId,
    recipient,
    body: cleanBody,
    paper: input.paper as PaperStyleId,
    stamp: input.stamp as StampId,
    hints: cleanHints,
    source: "bottle",
    createdAt: now,
    lock: { kind: "none" },
    burnAfterReading: false,
    openedAt: null,
    burnAt: null,
    reaction: null,
    published: false,
    attachedSong: input.attachedSong,
    senderName: input.isAnonymous ? null : (input.senderName?.trim() || null),
    version: 1,
  };

  const pipeline = redis.pipeline();
  pipeline.set(keys.letter(letterId), JSON.stringify(letterRecord), {
    ex: remainingSeconds,
  });
  pipeline.zadd(keys.mailboxLetters(recipient), {
    score: now,
    member: letterId,
  });
  pipeline.expire(keys.mailboxLetters(recipient), remainingSeconds);
  pipeline.incr(keys.mailboxUnread(recipient));

  await pipeline.exec();

  return { delivered: true };
}
