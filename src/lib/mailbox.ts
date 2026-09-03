import { CreateMailboxInput, RecoverMailboxInput, UpdateSettingsInput } from "./schemas";
import { MailboxRecord } from "./types";
import { DURATIONS } from "./constants";
import { keys } from "./keys";
import { getRedis } from "./redis";
import { generateAccessToken, generateRecoveryPasscode } from "./ids";
import { hashWithPepper, timingSafeEqual } from "./crypto";
import { ApiError } from "./api";

export const TTL_GRACE_S = 60;

/** Seconds until this mailbox's hard expiry, floored at 1. Single source of truth. */
export function remainingTtlSeconds(mailbox: Pick<MailboxRecord, "expiresAt">): number {
  return Math.max(1, Math.ceil((mailbox.expiresAt - Date.now()) / 1000));
}

export async function createMailbox(input: CreateMailboxInput): Promise<{
  username: string;
  accessToken: string;
  recoveryPasscode: string;
  expiresAt: number;
}> {
  const redis = getRedis();
  const usernameLower = input.username.toLowerCase();
  const lifetimeSeconds = DURATIONS[input.durationKey];
  const totalTtl = lifetimeSeconds + TTL_GRACE_S;

  // 1. Reserve username with atomic SET NX EX to win squatting race
  const reserved = await redis.set(
    keys.mailboxReservation(usernameLower),
    input.username,
    {
      nx: true,
      ex: totalTtl,
    }
  );

  if (!reserved) {
    throw new ApiError("USERNAME_TAKEN", "errors.usernameTaken", 409);
  }

  // 2. Generate secrets and hashes (raw secrets never stored)
  const accessToken = generateAccessToken();
  const recoveryPasscode = generateRecoveryPasscode();
  const accessTokenHash = hashWithPepper(accessToken);
  const recoveryPasscodeHash = hashWithPepper(recoveryPasscode);

  const now = Date.now();
  const expiresAt = now + lifetimeSeconds * 1000;

  const mailboxRecord: MailboxRecord = {
    name: input.name.trim(),
    username: input.username,
    usernameLower,
    accessTokenHash,
    gender: input.gender,
    acceptsBottles: true,
    createdAt: now,
    lastLoginAt: now,
    expiresAt,
    durationKey: input.durationKey,
    letterCount: 0,
    version: 1,
  };

  // 3. Store record, recovery hash, unread counter, and add to bottle pools
  const pipeline = redis.pipeline();
  pipeline.set(keys.mailbox(usernameLower), JSON.stringify(mailboxRecord), {
    ex: totalTtl,
  });
  pipeline.set(keys.mailboxRecovery(usernameLower), recoveryPasscodeHash, {
    ex: totalTtl,
  });
  pipeline.set(keys.mailboxUnread(usernameLower), 0, { ex: totalTtl });
  pipeline.zadd(keys.activeIndex(), { score: now, member: usernameLower });

  // Add to bottle pools by default
  pipeline.zadd(keys.bottlePool("any"), {
    score: expiresAt,
    member: usernameLower,
  });

  if (input.gender !== "unspecified") {
    pipeline.zadd(keys.bottlePool(input.gender), {
      score: expiresAt,
      member: usernameLower,
    });
  }

  await pipeline.exec();

  return {
    username: input.username,
    accessToken,
    recoveryPasscode,
    expiresAt,
  };
}

export async function recoverMailbox(input: RecoverMailboxInput): Promise<{
  name?: string;
  username: string;
  accessToken: string;
}> {
  const redis = getRedis();
  const usernameLower = input.username.toLowerCase();

  const storedPasscodeHash = await redis.get<string>(
    keys.mailboxRecovery(usernameLower)
  );

  if (!storedPasscodeHash) {
    // Deliberately identical error message to prevent username enumeration
    throw new ApiError("UNAUTHORIZED", "errors.recoveryFailed", 401);
  }

  const incomingPasscodeHash = hashWithPepper(input.passcode);
  const matches = timingSafeEqual(incomingPasscodeHash, storedPasscodeHash);

  if (!matches) {
    throw new ApiError("UNAUTHORIZED", "errors.recoveryFailed", 401);
  }

  // Load existing mailbox record
  const rawMailbox = await redis.get<string | MailboxRecord>(
    keys.mailbox(usernameLower)
  );

  if (!rawMailbox) {
    throw new ApiError("UNAUTHORIZED", "errors.recoveryFailed", 401);
  }

  const mailbox: MailboxRecord =
    typeof rawMailbox === "string" ? JSON.parse(rawMailbox) : rawMailbox;

  if (Date.now() > mailbox.expiresAt) {
    throw new ApiError("GONE", "errors.mailboxExpired", 410);
  }

  // Verify name identity (case-insensitive trimmed comparison)
  if (mailbox.name && mailbox.name.trim().toLowerCase() !== input.name.trim().toLowerCase()) {
    throw new ApiError("UNAUTHORIZED", "errors.recoveryFailed", 401);
  }

  // If mailbox did not have a name set (legacy record), record it
  if (!mailbox.name) {
    mailbox.name = input.name.trim();
  }

  // Rotate access token on successful recovery
  const newAccessToken = generateAccessToken();
  mailbox.accessTokenHash = hashWithPepper(newAccessToken);
  mailbox.lastLoginAt = Date.now();

  const ttl = remainingTtlSeconds(mailbox);
  const pipeline = redis.pipeline();
  pipeline.set(keys.mailbox(usernameLower), JSON.stringify(mailbox), {
    ex: ttl,
  });
  pipeline.zadd(keys.activeIndex(), { score: mailbox.lastLoginAt, member: usernameLower });
  await pipeline.exec();

  return {
    name: mailbox.name,
    username: mailbox.username,
    accessToken: newAccessToken,
  };
}

export async function getPublicMailbox(username: string): Promise<{
  name?: string;
  username: string;
  exists: boolean;
  acceptsBottles: boolean;
}> {
  const redis = getRedis();
  const usernameLower = username.toLowerCase();

  const raw = await redis.get<string | MailboxRecord>(keys.mailbox(usernameLower));
  if (!raw) {
    throw new ApiError("NOT_FOUND", "errors.mailboxNotFound", 404);
  }

  const mailbox: MailboxRecord = typeof raw === "string" ? JSON.parse(raw) : raw;

  if (Date.now() > mailbox.expiresAt) {
    // Collapse 410 into 404 on public route so expired and never-existed are indistinguishable (§API-05)
    throw new ApiError("NOT_FOUND", "errors.mailboxNotFound", 404);
  }

  return {
    name: mailbox.name || mailbox.username,
    username: mailbox.username,
    exists: true,
    acceptsBottles: mailbox.acceptsBottles,
  };
}

/**
 * Retrieves mailbox record or null if missing or expired
 */
export async function getMailbox(username: string): Promise<MailboxRecord | null> {
  const redis = getRedis();
  const usernameLower = username.toLowerCase();

  const raw = await redis.get<string | MailboxRecord>(keys.mailbox(usernameLower));
  if (!raw) return null;

  const mailbox: MailboxRecord = typeof raw === "string" ? JSON.parse(raw) : raw;

  if (Date.now() > mailbox.expiresAt) {
    return null;
  }

  return mailbox;
}

export const GRACE_MS = (7 * 86400 + TTL_GRACE_S) * 1000;

/**
 * Permanently wipes a user's entire mailbox and all associated data from Redis.
 */
export async function purgeInactiveMailbox(username: string): Promise<void> {
  const redis = getRedis();
  const usernameLower = username.toLowerCase();

  // 1. Fetch and delete all associated letters (chunked in batches of 50 per §PERF-01)
  const letterIds = await redis.zrange(keys.mailboxLetters(usernameLower), 0, -1);
  const CHUNK_SIZE = 50;
  for (let i = 0; i < letterIds.length; i += CHUNK_SIZE) {
    const chunk = letterIds.slice(i, i + CHUNK_SIZE);
    const chunkPipe = redis.pipeline();
    for (const letterId of chunk) {
      chunkPipe.del(keys.letter(letterId));
      chunkPipe.del(keys.letterReactions(letterId));
    }
    await chunkPipe.exec();
  }

  // 2. Delete mailbox record, letters index, recovery passcode, and unread counter
  const pipeline = redis.pipeline();
  pipeline.del(keys.mailboxLetters(usernameLower));
  pipeline.del(keys.mailbox(usernameLower));
  pipeline.del(keys.mailboxRecovery(usernameLower));
  pipeline.del(keys.mailboxUnread(usernameLower));

  // 3. Release claimed username from global reservation lock so handle becomes available again
  pipeline.del(keys.mailboxReservation(usernameLower));

  // 4. Remove from bottle pools & active index
  pipeline.zrem(keys.bottlePool("any"), usernameLower);
  pipeline.zrem(keys.bottlePool("male"), usernameLower);
  pipeline.zrem(keys.bottlePool("female"), usernameLower);
  pipeline.zrem(keys.bottlePool("other"), usernameLower);
  pipeline.zrem(keys.activeIndex(), usernameLower);

  await pipeline.exec();
}

/**
 * Updates active index for observability with a 5-minute throttle (§PERF-02).
 */
export async function touchMailboxLogin(mailbox: MailboxRecord): Promise<void> {
  const now = Date.now();
  // Throttle: skip the write when last activity was less than 5 minutes ago (§PERF-02)
  if (mailbox.lastLoginAt && now - mailbox.lastLoginAt < 5 * 60_000) {
    return;
  }

  const redis = getRedis();
  await redis.zadd(keys.activeIndex(), { score: now, member: mailbox.usernameLower });
}

/**
 * Scans active index using range query on sorted set (§PERF-01).
 * Capped at 200 mailboxes per invocation.
 */
export async function cleanupInactiveMailboxes(): Promise<number> {
  const redis = getRedis();
  const cutoff = Date.now() - GRACE_MS;
  const stale = await redis.zrange(keys.activeIndex(), 0, cutoff, {
    byScore: true,
    offset: 0,
    count: 200,
  });

  if (!stale || stale.length === 0) {
    return 0;
  }

  for (const u of stale) {
    if (u) {
      await purgeInactiveMailbox(u);
    }
  }

  return stale.length;
}

export async function updateMailboxSettings(
  mailbox: MailboxRecord,
  input: UpdateSettingsInput
): Promise<{ acceptsBottles: boolean }> {
  const redis = getRedis();
  const usernameLower = mailbox.usernameLower;

  mailbox.acceptsBottles = input.acceptsBottles;

  const remainingSeconds = remainingTtlSeconds(mailbox);

  const pipeline = redis.pipeline();
  pipeline.set(keys.mailbox(usernameLower), JSON.stringify(mailbox), {
    ex: remainingSeconds,
  });

  if (input.acceptsBottles) {
    pipeline.zadd(keys.bottlePool("any"), {
      score: mailbox.expiresAt,
      member: usernameLower,
    });
    if (mailbox.gender !== "unspecified") {
      pipeline.zadd(keys.bottlePool(mailbox.gender), {
        score: mailbox.expiresAt,
        member: usernameLower,
      });
    }
  } else {
    pipeline.zrem(keys.bottlePool("any"), usernameLower);
    pipeline.zrem(keys.bottlePool("male"), usernameLower);
    pipeline.zrem(keys.bottlePool("female"), usernameLower);
    pipeline.zrem(keys.bottlePool("other"), usernameLower);
  }

  await pipeline.exec();

  return { acceptsBottles: input.acceptsBottles };
}
