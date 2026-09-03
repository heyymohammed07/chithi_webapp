import { NextRequest } from "next/server";
import { getPublicMailbox } from "@/lib/mailbox";
import { checkRateLimit } from "@/lib/ratelimit";
import { apiOk, apiErr, ApiError, getRateKey, rateLimitHeaders } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await props.params;
    const rateKey = getRateKey(req);

    // Rate limit public checks: 60 / min
    const rl = await checkRateLimit("read", rateKey);
    if (!rl.success) {
      return apiErr("RATE_LIMITED", "errors.rateLimited", 429, undefined, rateLimitHeaders(rl));
    }

    const mailboxMeta = await getPublicMailbox(username);
    return apiOk(mailboxMeta);
  } catch (error) {
    if (error instanceof ApiError) {
      return apiErr(error.code, error.messageKey, error.status, error.details);
    }
    console.error("[GET /api/mailbox/[username] error]", error);
    return apiErr("INTERNAL", "errors.internal", 500);
  }
}
