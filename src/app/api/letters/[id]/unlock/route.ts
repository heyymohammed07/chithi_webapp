import { NextRequest } from "next/server";
import { UnlockLetterSchema } from "@/lib/schemas";
import { unlockLetter } from "@/lib/letters";
import { requireMailboxOwner } from "@/lib/auth";
import { checkRateLimit } from "@/lib/ratelimit";
import { apiOk, apiErr, ApiError, parseJsonBody, rateLimitHeaders } from "@/lib/api";
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

    // Rate limit: 10 attempts / 10m per token hash + letter ID (§10.1)
    const tokenHash = hashWithPepper(token);
    const rlKey = `${tokenHash}:${id}`;
    const rl = await checkRateLimit("unlock", rlKey);
    if (!rl.success) {
      return apiErr("RATE_LIMITED", "errors.rateLimited", 429, undefined, rateLimitHeaders(rl));
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
