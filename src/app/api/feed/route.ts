import { NextRequest } from "next/server";
import { listFeedItems } from "@/lib/feed";
import { checkRateLimit } from "@/lib/ratelimit";
import { apiOk, apiErr, ApiError, getViewerHash } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const viewerHash = getViewerHash(req);

    // Rate limit: 60 reads / min per viewer hash (§10.1)
    const rl = await checkRateLimit("read", viewerHash);
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

    const url = new URL(req.url);
    const tabParam = url.searchParams.get("tab");
    const tab: "trending" | "latest" = tabParam === "trending" ? "trending" : "latest";

    const cursorParam = url.searchParams.get("cursor");
    const cursor = cursorParam ? parseInt(cursorParam, 10) || 0 : 0;

    const data = await listFeedItems(tab, cursor, viewerHash);
    return apiOk(data);
  } catch (error) {
    if (error instanceof ApiError) {
      return apiErr(error.code, error.messageKey, error.status, error.details);
    }
    console.error("[GET /api/feed error]", error);
    return apiErr("INTERNAL", "errors.internal", 500);
  }
}
