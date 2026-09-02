import { NextRequest } from "next/server";
import { publishLetterToFeed } from "@/lib/feed";
import { requireMailboxOwner } from "@/lib/auth";
import { checkRateLimit } from "@/lib/ratelimit";
import { apiOk, apiErr, ApiError } from "@/lib/api";
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
    const username =
      url.searchParams.get("username") || req.headers.get("x-username");

    if (!username) {
      throw new ApiError("VALIDATION_FAILED", "errors.validation.usernameRequired", 400);
    }

    const { mailbox, token } = await requireMailboxOwner(req, username);

    // Rate limit: 5 / 1h on token hash (§10.1)
    const tokenHash = hashWithPepper(token);
    const rl = await checkRateLimit("publish", tokenHash);
    if (!rl.success) {
      const retryAfter = Math.max(1, Math.ceil((rl.reset - Date.now()) / 1000));
      return apiErr(
        "RATE_LIMITED",
        "errors.rateLimited",
        429,
        undefined,
        {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(rl.limit),
          "X-RateLimit-Remaining": String(rl.remaining),
          "X-RateLimit-Reset": String(rl.reset),
        }
      );
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
