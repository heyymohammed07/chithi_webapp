import { FeedRecord, LetterRecord } from "./types";
import { FEED_PAGE_SIZE, FEED_TTL_S } from "./constants";
import { keys } from "./keys";
import { getRedis } from "./redis";
import { generateFeedId } from "./ids";
import { ApiError } from "./api";

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

  if (letter.lock.kind === "riddle" && letter.lock.solvedAt === null) {
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
  const ttl = Math.max(1, await redis.ttl(keys.letter(letterId)));
  pipeline.set(keys.letter(letterId), JSON.stringify(letter), { ex: ttl });

  await pipeline.exec();

  return { feedId };
}

export async function listFeedItems(
  tab: "trending" | "latest",
  cursor = 0,
  viewerHash: string
): Promise<{ items: FeedItemWithViewer[]; nextCursor: number | null }> {
  const redis = getRedis();
  const indexKey = tab === "trending" ? keys.feedTrending() : keys.feedIds();
  const now = Date.now();

  // Self-prune feed items older than 48 hours (§5.5)
  const cutoff48h = now - FEED_TTL_S * 1000;
  await redis.zremrangebyscore(keys.feedIds(), 0, cutoff48h);

  // Fetch page of IDs using index range
  const start = cursor;
  const stop = cursor + FEED_PAGE_SIZE - 1;
  const feedIds =
    typeof redis.zrange === "function"
      ? await redis.zrange(indexKey, start, stop, { rev: true })
      : await redis.zrevrange(indexKey, start, stop);

  if (!feedIds || feedIds.length === 0) {
    return { items: [], nextCursor: null };
  }

  // MGET item bodies
  const itemKeys = feedIds.map((id) => keys.feedItem(id));
  const rawItems = await redis.mget<unknown[]>(...itemKeys);

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
    const dedupKey = keys.feedReactionDedup(id, viewerHash);
    const hasReacted = Boolean(await redis.get(dedupKey));

    items.push({
      ...item,
      viewerHasReacted: hasReacted,
    });
  }

  // Prune any missing feed IDs
  if (ghostIds.length > 0) {
    const pipeline = redis.pipeline();
    pipeline.zrem(keys.feedIds(), ...ghostIds);
    pipeline.zrem(keys.feedTrending(), ...ghostIds);
    pipeline.exec().catch((e) => console.error("Feed ghost prune error:", e));
  }

  const nextCursor = feedIds.length === FEED_PAGE_SIZE ? stop + 1 : null;

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

export async function publishDirectToFeed(
  body: string,
  paper: any,
  stamp: any
): Promise<{ feedId: string }> {
  const redis = getRedis();
  const feedId = generateFeedId();
  const now = Date.now();

  const feedRecord: FeedRecord = {
    id: feedId,
    body,
    paper,
    stamp,
    createdAt: now,
    hearts: 0,
    heartCracks: 0,
    version: 1,
  };

  const pipeline = redis.pipeline();
  pipeline.set(keys.feedItem(feedId), JSON.stringify(feedRecord), { ex: FEED_TTL_S });
  pipeline.zadd(keys.feedIds(), { score: now, member: feedId });
  pipeline.zadd(keys.feedTrending(), { score: 0, member: feedId });
  pipeline.expire(keys.feedIds(), FEED_TTL_S);
  pipeline.expire(keys.feedTrending(), FEED_TTL_S);
  await pipeline.exec();

  return { feedId };
}

