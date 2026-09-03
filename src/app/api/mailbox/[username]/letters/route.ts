import { NextRequest } from "next/server";
import { listLetters } from "@/lib/letters";
import { requireMailboxOwner } from "@/lib/auth";
import { checkRateLimit } from "@/lib/ratelimit";
import { apiOk, apiErr, ApiError, getRateKey, rateLimitHeaders } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const rateKey = getRateKey(req);
    const rl = await checkRateLimit("read", rateKey);
    if (!rl.success) {
      return apiErr("RATE_LIMITED", "errors.rateLimited", 429, undefined, rateLimitHeaders(rl));
    }

    const { username } = await params;
    if (!username) {
      throw new ApiError("VALIDATION_FAILED", "errors.validation.usernameRequired", 400);
    }

    const url = new URL(req.url);
    const cursorParam = url.searchParams.get("cursor");
    const cursor = cursorParam ? parseInt(cursorParam, 10) || 0 : 0;

    const { mailbox } = await requireMailboxOwner(req, username);
    const result = await listLetters(mailbox.usernameLower, cursor);

    return apiOk({
      letters: result.items,
      items: result.items,
      nextCursor: result.nextCursor,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return apiErr(error.code, error.messageKey, error.status, error.details);
    }
    console.error("[GET /api/mailbox/[username]/letters error]", error);
    return apiErr("INTERNAL", "errors.internal", 500);
  }
}
