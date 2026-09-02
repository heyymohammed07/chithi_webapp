import { NextRequest } from "next/server";
import { getPublicMailbox } from "@/lib/mailbox";
import { checkRateLimit } from "@/lib/ratelimit";
import { apiOk, apiErr, ApiError, getViewerHash } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await props.params;
    const viewerHash = getViewerHash(req);

    // Rate limit public checks: 60 / min
    const rl = await checkRateLimit("read", viewerHash);
    if (!rl.success) {
      const retryAfter = Math.max(1, Math.ceil((rl.reset - Date.now()) / 1000));
      return apiErr("RATE_LIMITED", "errors.rateLimited", 429, undefined, {
        "Retry-After": String(retryAfter),
      });
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
