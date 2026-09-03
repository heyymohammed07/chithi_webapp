import { FeedRecord, LetterRecord } from "./types";
import { FEED_PAGE_SIZE, FEED_TTL_S } from "./constants";
import { keys } from "./keys";
import { getRedis } from "./redis";
import { generateFeedId } from "./ids";
import { ApiError } from "./api";
import { getMailbox, remainingTtlSeconds } from "./mailbox";

export interface FeedItemWithViewer extends FeedRecord {
  viewerHasReacted: boolean;
}

export async function publishLetterToFeed(
  usernameLower: string,
  letterId: string
): Promise<{ feedId: string }> {
  const redis = getRedis();
  const raw = await redis.get<string | LetterRecord>(keys.letter(letterId));

  if (!raw) {
    throw new ApiError("NOT_FOUND", "errors.letterNotFound", 404);
  }

  const letter: LetterRecord = typeof raw === "string" ? JSON.parse(raw) : raw;

  if (letter.recipient !== usernameLower) {
    throw new ApiError("FORBIDDEN", "errors.forbidden", 403);
  }

  if (letter.published) {
    throw new ApiError("ALREADY_DONE", "errors.alreadyPublished", 409);
  }

  if (letter.burnAfterReading) {
    throw new ApiError("FORBIDDEN", "errors.cannotPublishBurnLetter", 403);
  }

  if (letter.lock.kind === "capsule" && Date.now() < letter.lock.unlockAt) {
    throw new ApiError("LOCKED", "errors.letterLockedCapsule", 423);
  }

  if (letter.lock.kind === "riddle" && !letter.lock.solvedAt) {
    throw new ApiError("LOCKED", "errors.letterLockedRiddle", 423);
  }

  // Create brand new feed record with unlinkable ID, STRIPPING recipient, hints, locks (§5.4)
  const feedId = generateFeedId();
  const now = Date.now();

  const feedRecord: FeedRecord = {
    id: feedId,
    body: letter.body,
    paper: letter.paper,
    stamp: letter.stamp,
    createdAt: now,
    hearts: 0,
    heartCracks: 0,
    version: 1,
  };

  const pipeline = redis.pipeline();
  pipeline.set(keys.feedItem(feedId), JSON.stringify(feedRecord), {
    ex: FEED_TTL_S,
  });
  pipeline.zadd(keys.feedIds(), { score: now, member: feedId });
  pipeline.zadd(keys.feedTrending(), { score: 0, member: feedId });

  // Mark original letter as published
  letter.published = true;
  const mailbox = await getMailbox(usernameLower);
  if (!mailbox) {
    throw new ApiError("GONE", "errors.mailboxExpired", 410);
  }
  const ttl = remainingTtlSeconds(mailbox);
  pipeline.set(keys.letter(letterId), JSON.stringify(letter), { ex: ttl });

  await pipeline.exec();

  return { feedId };
}

export async function pruneExpiredFeedItems(): Promise<number> {
  const redis = getRedis();
  const now = Date.now();
  const cutoff48h = now - FEED_TTL_S * 1000;
  let totalPruned = 0;

  // Read expired IDs before deleting them so both indexes can be cleaned symmetrically (§COR-09)
  const expired = await redis.zrange(keys.feedIds(), 0, cutoff48h, { byScore: true });
  if (expired.length > 0) {
    // Chunk removal at 500 IDs per pipeline so one sweep does not exceed time budget
    for (let i = 0; i < expired.length; i += 500) {
      const chunk = expired.slice(i, i + 500);
      const p = redis.pipeline();
      p.zrem(keys.feedIds(), ...chunk);
      p.zrem(keys.feedTrending(), ...chunk);
      for (const id of chunk) {
        p.del(keys.feedItem(id));
      }
      await p.exec();
      totalPruned += chunk.length;
    }
  }

  return totalPruned;
}

export async function listFeedItems(
  tab: "trending" | "latest",
  cursorString: string | null = null,
  viewerHash: string
): Promise<{ items: FeedItemWithViewer[]; nextCursor: string | null }> {
  const redis = getRedis();

  let feedIds: string[] = [];
  let nextCursor: string | null = null;

  if (tab === "latest") {
    let offset = 0;
    if (cursorString) {
      const parts = cursorString.split(":");
      if (parts[0] !== "latest") {
        throw new ApiError("VALIDATION_FAILED", "errors.validation.invalidCursor", 400);
      }
      offset = parseInt(parts[1] || "0", 10) || 0;
    }

    const start = offset;
    const stop = offset + FEED_PAGE_SIZE - 1;
    feedIds = await redis.zrange(keys.feedIds(), start, stop, { rev: true });

    if (feedIds.length === FEED_PAGE_SIZE) {
      nextCursor = `latest:${offset + FEED_PAGE_SIZE}`;
    }
  } else {
    // trending tab: paginate by (score, member) (§COR-08)
    let minScoreBound: number | string = "+inf";
    let lastSeenMember: string | null = null;

    if (cursorString) {
      const parts = cursorString.split(":");
      if (parts[0] !== "trending") {
        throw new ApiError("VALIDATION_FAILED", "errors.validation.invalidCursor", 400);
      }
      const scoreVal = parts[1];
      lastSeenMember = parts[2] || null;
      if (scoreVal !== undefined) {
        minScoreBound = Number(scoreVal);
      }
    }

    // Fetch entries with scores
    const rawEntries = await redis.zrange<{ member: string; score: number }>(
      keys.feedTrending(),
      minScoreBound === "+inf" ? "+inf" : minScoreBound,
      "-inf",
      {
        byScore: true,
        rev: true,
        withScores: true,
        offset: 0,
        count: FEED_PAGE_SIZE + 50,
      }
    );

    let startIndex = 0;
    if (lastSeenMember && minScoreBound !== "+inf") {
      const idx = rawEntries.findIndex(
        (e) => e.member === lastSeenMember && e.score === Number(minScoreBound)
      );
      if (idx !== -1) {
        startIndex = idx + 1;
      }
    }

    const pageEntries = rawEntries.slice(startIndex, startIndex + FEED_PAGE_SIZE);
    feedIds = pageEntries.map((e) => e.member);

    if (pageEntries.length === FEED_PAGE_SIZE) {
      const last = pageEntries[pageEntries.length - 1]!;
      nextCursor = `trending:${last.score}:${last.member}`;
    }
  }

  if (!feedIds || feedIds.length === 0) {
    return { items: [], nextCursor: null };
  }

  // Issue parallel MGET for item bodies and reaction dedup keys (§PERF-03)
  const itemKeys = feedIds.map((id) => keys.feedItem(id));
  const dedupKeys = feedIds.map((id) => keys.feedReactionDedup(id, viewerHash));

  const [rawItems, rawDedup] = await Promise.all([
    redis.mget<unknown[]>(...itemKeys),
    redis.mget<unknown[]>(...dedupKeys),
  ]);

  const items: FeedItemWithViewer[] = [];
  const ghostIds: string[] = [];

  for (let i = 0; i < feedIds.length; i++) {
    const id = feedIds[i];
    const raw = rawItems[i];

    if (!id || !raw) {
      if (id) ghostIds.push(id);
      continue;
    }

    const item: FeedRecord = typeof raw === "string" ? JSON.parse(raw) : raw;
    const hasReacted = Boolean(rawDedup && rawDedup[i]);

    items.push({
      ...item,
      viewerHasReacted: hasReacted,
    });
  }

  // Cheap ghost-prune on read
  if (ghostIds.length > 0) {
    const pipeline = redis.pipeline();
    pipeline.zrem(keys.feedIds(), ...ghostIds);
    pipeline.zrem(keys.feedTrending(), ...ghostIds);
    pipeline.exec().catch((e) => console.error("Feed ghost prune error:", e));
  }

  return { items, nextCursor };
}

export async function reactToFeedItem(
  feedId: string,
  reaction: "heart" | "heartCrack",
  viewerHash: string
): Promise<{ hearts: number; heartCracks: number }> {
  const redis = getRedis();

  // 1. Server-side deduplication via SET NX EX 48h (§7.2, §10.2)
  const dedupKey = keys.feedReactionDedup(feedId, viewerHash);
  const acquired = await redis.set(dedupKey, "1", { nx: true, ex: FEED_TTL_S });

  if (!acquired) {
    throw new ApiError("ALREADY_DONE", "errors.alreadyReacted", 409);
  }

  // 2. Load feed record
  const raw = await redis.get<string | FeedRecord>(keys.feedItem(feedId));
  if (!raw) {
    throw new ApiError("NOT_FOUND", "errors.feedItemNotFound", 404);
  }

  const item: FeedRecord = typeof raw === "string" ? JSON.parse(raw) : raw;

  if (reaction === "heart") {
    item.hearts += 1;
  } else {
    item.heartCracks += 1;
  }

  const trendingScore = item.hearts + item.heartCracks;
  const ttl = Math.max(1, await redis.ttl(keys.feedItem(feedId)));

  const pipeline = redis.pipeline();
  pipeline.set(keys.feedItem(feedId), JSON.stringify(item), { ex: ttl });
  pipeline.zadd(keys.feedTrending(), { score: trendingScore, member: feedId });
  await pipeline.exec();

  return { hearts: item.hearts, heartCracks: item.heartCracks };
}

export async function reportContent(
  targetType: "letter" | "feed",
  targetId: string,
  _reason: string,
  _note?: string
): Promise<{ reported: true }> {
  const redis = getRedis();
  const reportKey = keys.report(targetType, targetId);

  const count = await redis.hincrby(reportKey, "count", 1);
  await redis.expire(reportKey, 7 * 86400); // 7d retention

  // Auto-quarantine: at 3 distinct reports on a feed item, remove it immediately (§7.2)
  if (targetType === "feed" && count >= 3) {
    console.warn(`[chithi moderation] Quarantining feed item "${targetId}" after ${count} reports.`);
    const pipeline = redis.pipeline();
    pipeline.del(keys.feedItem(targetId));
    pipeline.zrem(keys.feedIds(), targetId);
    pipeline.zrem(keys.feedTrending(), targetId);
    await pipeline.exec();
  }

  return { reported: true };
}

