import { CreateMailboxInput, RecoverMailboxInput, UpdateSettingsInput } from "./schemas";
import { MailboxRecord } from "./types";
import { DURATIONS, SEVEN_DAYS_MS, SEVEN_DAYS_SECONDS } from "./constants";
import { keys } from "./keys";
import { getRedis } from "./redis";
import { generateAccessToken, generateRecoveryPasscode } from "./ids";
import { hashWithPepper, timingSafeEqual } from "./crypto";
import { ApiError } from "./api";

export async function createMailbox(input: CreateMailboxInput): Promise<{
  username: string;
  accessToken: string;
  recoveryPasscode: string;
  expiresAt: number;
}> {
  const redis = getRedis();
  const usernameLower = input.username.toLowerCase();
  const lifetimeSeconds = DURATIONS[input.durationKey];

  // 1. Reserve username with atomic SET NX EX to win squatting race (persists for 7-day inactive cycle)
  const reserved = await redis.set(
    keys.mailboxReservation(usernameLower),
    input.username,
    {
      nx: true,
      ex: SEVEN_DAYS_SECONDS,
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
    ex: SEVEN_DAYS_SECONDS,
  });
  pipeline.set(keys.mailboxRecovery(usernameLower), recoveryPasscodeHash, {
    ex: SEVEN_DAYS_SECONDS,
  });
  pipeline.set(keys.mailboxUnread(usernameLower), 0, { ex: SEVEN_DAYS_SECONDS });
  pipeline.zadd("mb:active", { score: now, member: usernameLower });

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

  const pipeline = redis.pipeline();
  pipeline.set(keys.mailbox(usernameLower), JSON.stringify(mailbox), {
    ex: SEVEN_DAYS_SECONDS,
  });
  pipeline.expire(keys.mailboxLetters(usernameLower), SEVEN_DAYS_SECONDS);
  pipeline.expire(keys.mailboxRecovery(usernameLower), SEVEN_DAYS_SECONDS);
  pipeline.expire(keys.mailboxUnread(usernameLower), SEVEN_DAYS_SECONDS);
  pipeline.expire(keys.mailboxReservation(usernameLower), SEVEN_DAYS_SECONDS);
  pipeline.zadd("mb:active", { score: mailbox.lastLoginAt, member: usernameLower });
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
  expiresAt: number;
}> {
  const redis = getRedis();
  const usernameLower = username.toLowerCase();

  const raw = await redis.get<string | MailboxRecord>(keys.mailbox(usernameLower));
  if (!raw) {
    throw new ApiError("NOT_FOUND", "errors.mailboxNotFound", 404);
  }

  const mailbox: MailboxRecord = typeof raw === "string" ? JSON.parse(raw) : raw;

  // 7-day inactivity purge guard (§2.B)
  const lastActive = mailbox.lastLoginAt ?? mailbox.createdAt;
  if (Date.now() - lastActive > SEVEN_DAYS_MS) {
    await purgeInactiveMailbox(usernameLower);
    throw new ApiError("GONE", "errors.mailboxExpired", 410);
  }

  if (Date.now() > mailbox.expiresAt) {
    throw new ApiError("GONE", "errors.mailboxExpired", 410);
  }

  return {
    name: mailbox.name || mailbox.username,
    username: mailbox.username,
    exists: true,
    acceptsBottles: mailbox.acceptsBottles,
    expiresAt: mailbox.expiresAt,
  };
}

/**
 * Lazy Deletion on Access / Lookup (§2.B)
 * Retrieves mailbox or purges it if 7 consecutive days of inactivity have passed.
 */
export async function getMailbox(username: string): Promise<MailboxRecord | null> {
  const redis = getRedis();
  const usernameLower = username.toLowerCase();

  const raw = await redis.get<string | MailboxRecord>(keys.mailbox(usernameLower));
  if (!raw) return null;

  const mailbox: MailboxRecord = typeof raw === "string" ? JSON.parse(raw) : raw;

  const lastActive = mailbox.lastLoginAt ?? mailbox.createdAt;
  if (Date.now() - lastActive > SEVEN_DAYS_MS) {
    await purgeInactiveMailbox(usernameLower);
    return null;
  }

  return mailbox;
}

/**
 * Cascade Purge Helper (§2.C)
 * Permanently wipes a user's entire mailbox and all associated data from Redis.
 */
export async function purgeInactiveMailbox(username: string): Promise<void> {
  const redis = getRedis();
  const usernameLower = username.toLowerCase();

  // 1. Fetch and delete all associated letters
  const letterIds = await redis.zrange(keys.mailboxLetters(usernameLower), 0, -1);

  const pipeline = redis.pipeline();
  for (const letterId of letterIds) {
    pipeline.del(keys.letter(letterId));
    pipeline.del(keys.letterReactions(letterId));
  }

  // 2. Delete mailbox record, letters index, recovery passcode, and unread counter
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
  pipeline.zrem("mb:active", usernameLower);

  await pipeline.exec();
}

/**
 * Refreshes lastLoginAt and extends 7-day TTL on key Redis structures (§1, §2.A)
 */
export async function touchMailboxLogin(username: string): Promise<void> {
  const redis = getRedis();
  const usernameLower = username.toLowerCase();

  const raw = await redis.get<string | MailboxRecord>(keys.mailbox(usernameLower));
  if (!raw) return;

  const mailbox: MailboxRecord = typeof raw === "string" ? JSON.parse(raw) : raw;
  const now = Date.now();
  mailbox.lastLoginAt = now;

  const pipeline = redis.pipeline();
  pipeline.set(keys.mailbox(usernameLower), JSON.stringify(mailbox), {
    ex: SEVEN_DAYS_SECONDS,
  });
  pipeline.expire(keys.mailboxLetters(usernameLower), SEVEN_DAYS_SECONDS);
  pipeline.expire(keys.mailboxRecovery(usernameLower), SEVEN_DAYS_SECONDS);
  pipeline.expire(keys.mailboxUnread(usernameLower), SEVEN_DAYS_SECONDS);
  pipeline.expire(keys.mailboxReservation(usernameLower), SEVEN_DAYS_SECONDS);
  pipeline.zadd("mb:active", { score: now, member: usernameLower });

  await pipeline.exec();
}

/**
 * Scans active mailboxes and cascades purge on any with >7 days of inactivity (§3)
 */
export async function cleanupInactiveMailboxes(): Promise<number> {
  const redis = getRedis();
  let purgedCount = 0;
  const now = Date.now();

  const mbKeys = await redis.keys("mb:*");
  const processedUsernames = new Set<string>();

  for (const key of mbKeys) {
    if (
      key.startsWith("mb:name:") ||
      key.startsWith("mb:recover:") ||
      key.startsWith("mb:ltrs:") ||
      key.startsWith("mb:unread:") ||
      key.startsWith("mb:active")
    ) {
      continue;
    }

    const usernameLower = key.replace(/^mb:/, "").trim();
    if (!usernameLower || processedUsernames.has(usernameLower)) continue;
    processedUsernames.add(usernameLower);

    const raw = await redis.get<string | MailboxRecord>(key);
    if (!raw) continue;

    const mailbox: MailboxRecord = typeof raw === "string" ? JSON.parse(raw) : raw;
    const lastActive = mailbox.lastLoginAt ?? mailbox.createdAt;

    if (now - lastActive > SEVEN_DAYS_MS) {
      await purgeInactiveMailbox(usernameLower);
      purgedCount++;
    }
  }

  return purgedCount;
}

export async function updateMailboxSettings(
  mailbox: MailboxRecord,
  input: UpdateSettingsInput
): Promise<{ acceptsBottles: boolean }> {
  const redis = getRedis();
  const usernameLower = mailbox.usernameLower;

  mailbox.acceptsBottles = input.acceptsBottles;

  const remainingSeconds = Math.max(
    1,
    Math.floor((mailbox.expiresAt - Date.now()) / 1000)
  );

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
