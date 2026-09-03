import { NextRequest } from "next/server";
import { cleanupInactiveMailboxes } from "@/lib/mailbox";
import { pruneExpiredFeedItems } from "@/lib/feed";
import { timingSafeEqual, sha256 } from "@/lib/crypto";
import { apiOk, apiErr } from "@/lib/api";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function checkCronAuth(req: NextRequest): boolean {
  const cronSecret = env.CRON_SECRET || process.env.CRON_SECRET;
  if (!cronSecret) return false;

  const authHeader = req.headers.get("authorization");
  const customHeader = req.headers.get("x-cron-secret");

  let incomingToken: string | null = null;
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    incomingToken = authHeader.slice(7).trim();
  } else if (customHeader) {
    incomingToken = customHeader.trim();
  }

  if (!incomingToken) return false;

  // Compare SHA-256 hashes of both strings using timing-safe comparison per SEC-06
  const incomingHash = sha256(incomingToken);
  const expectedHash = sha256(cronSecret);
  return timingSafeEqual(incomingHash, expectedHash);
}

export async function GET(req: NextRequest) {
  try {
    if (!checkCronAuth(req)) {
      return apiErr("UNAUTHORIZED", "errors.unauthorized", 401);
    }

    const [purgedCount, feedPrunedCount] = await Promise.all([
      cleanupInactiveMailboxes(),
      pruneExpiredFeedItems(),
    ]);

    return apiOk({ purgedCount, feedPrunedCount });
  } catch (error) {
    console.error("[GET /api/cron/cleanup error]", error);
    return apiErr("INTERNAL", "errors.internal", 500);
  }
}
