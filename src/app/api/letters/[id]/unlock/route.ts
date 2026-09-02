import { NextRequest } from "next/server";
import { UnlockLetterSchema } from "@/lib/schemas";
import { unlockLetter } from "@/lib/letters";
import { requireMailboxOwner } from "@/lib/auth";
import { checkRateLimit } from "@/lib/ratelimit";
import { apiOk, apiErr, ApiError, parseJsonBody } from "@/lib/api";
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

    // Rate limit: 10 attempts / 10m per token hash + letter ID (§10.1)
    const tokenHash = hashWithPepper(token);
    const rlKey = `${tokenHash}:${id}`;
    const rl = await checkRateLimit("unlock", rlKey);
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

    const input = await parseJsonBody(req, UnlockLetterSchema);
    const result = await unlockLetter(mailbox.usernameLower, id, input.answer);

    return apiOk(result);
  } catch (error) {
    if (error instanceof ApiError) {
      return apiErr(error.code, error.messageKey, error.status, error.details);
    }
    console.error("[POST /api/letters/[id]/unlock error]", error);
    return apiErr("INTERNAL", "errors.internal", 500);
  }
}
