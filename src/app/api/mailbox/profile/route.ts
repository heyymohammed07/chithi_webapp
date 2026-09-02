import { NextRequest } from "next/server";
import { requireMailboxOwner } from "@/lib/auth";
import { getRedis } from "@/lib/redis";
import { keys } from "@/lib/keys";
import { apiOk, apiErr, ApiError } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const username =
      url.searchParams.get("username") || req.headers.get("x-username");

    if (!username) {
      throw new ApiError("VALIDATION_FAILED", "errors.validation.usernameRequired", 400);
    }

    // Owner authorization guard: verifies Bearer token or session cookie
    const { mailbox } = await requireMailboxOwner(req, username);

    const redis = getRedis();
    const usernameLower = mailbox.usernameLower;

    // Fetch authoritative unread count and total envelopes count from Redis
    const [rawUnread, totalCount] = await Promise.all([
      redis.get<number | string>(keys.mailboxUnread(usernameLower)),
      redis.zcard(keys.mailboxLetters(usernameLower)),
    ]);

    const unreadCount =
      typeof rawUnread === "number"
        ? rawUnread
        : parseInt(String(rawUnread || 0), 10) || 0;

    return apiOk({
      name: mailbox.name || mailbox.username,
      username: mailbox.username,
      gender: mailbox.gender,
      expiresAt: mailbox.expiresAt,
      unreadCount: Math.max(0, unreadCount),
      totalEnvelopeCount: Math.max(0, totalCount),
      acceptsBottles: mailbox.acceptsBottles,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return apiErr(error.code, error.messageKey, error.status, error.details);
    }
    console.error("[GET /api/mailbox/profile error]", error);
    return apiErr("INTERNAL", "errors.internal", 500);
  }
}
