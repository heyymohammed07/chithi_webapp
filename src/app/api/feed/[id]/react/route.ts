import { NextRequest } from "next/server";
import { ReactFeedSchema } from "@/lib/schemas";
import { reactToFeedItem } from "@/lib/feed";
import { checkRateLimit } from "@/lib/ratelimit";
import { apiOk, apiErr, ApiError, getViewerHash, parseJsonBody } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const viewerHash = getViewerHash(req);

    // Rate limit: 30 reacts / min per viewer hash (§10.1)
    const rl = await checkRateLimit("react", viewerHash);
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

    const input = await parseJsonBody(req, ReactFeedSchema);
    const result = await reactToFeedItem(id, input.reaction, viewerHash);

    return apiOk(result);
  } catch (error) {
    if (error instanceof ApiError) {
      return apiErr(error.code, error.messageKey, error.status, error.details);
    }
    console.error("[POST /api/feed/[id]/react error]", error);
    return apiErr("INTERNAL", "errors.internal", 500);
  }
}
