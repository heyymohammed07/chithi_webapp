import { NextRequest } from "next/server";
import { publishLetterToFeed } from "@/lib/feed";
import { requireMailboxOwner } from "@/lib/auth";
import { checkRateLimit } from "@/lib/ratelimit";
import { apiOk, apiErr, ApiError, rateLimitHeaders } from "@/lib/api";
import { hashWithPepper } from "@/lib/crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const url = new URL(req.url);
    const usernameParam = url.searchParams.get("username");
    const username = usernameParam?.toLowerCase();

    if (!username) {
      throw new ApiError("VALIDATION_FAILED", "errors.validation.usernameRequired", 400);
    }

    const { mailbox, token } = await requireMailboxOwner(req, username);

    // Rate limit: 5 / 1h on token hash (§10.1)
    const tokenHash = hashWithPepper(token);
    const rl = await checkRateLimit("publish", tokenHash);
    if (!rl.success) {
      return apiErr("RATE_LIMITED", "errors.rateLimited", 429, undefined, rateLimitHeaders(rl));
    }

    const result = await publishLetterToFeed(mailbox.usernameLower, id);
    return apiOk(result);
  } catch (error) {
    if (error instanceof ApiError) {
      return apiErr(error.code, error.messageKey, error.status, error.details);
    }
    console.error("[POST /api/letters/[id]/publish error]", error);
    return apiErr("INTERNAL", "errors.internal", 500);
  }
}
