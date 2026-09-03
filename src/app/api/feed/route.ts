import { NextRequest } from "next/server";
import { listFeedItems } from "@/lib/feed";
import { checkRateLimit } from "@/lib/ratelimit";
import { apiOk, apiErr, ApiError, getRateKey, getViewerHash, rateLimitHeaders } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const rateKey = getRateKey(req);
    const viewerHash = getViewerHash(req);

    // Rate limit: 60 reads / min per IP (§10.1)
    const rl = await checkRateLimit("read", rateKey);
    if (!rl.success) {
      return apiErr("RATE_LIMITED", "errors.rateLimited", 429, undefined, rateLimitHeaders(rl));
    }

    const url = new URL(req.url);
    const tabParam = url.searchParams.get("tab");
    const tab: "trending" | "latest" = tabParam === "trending" ? "trending" : "latest";

    const cursorParam = url.searchParams.get("cursor");

    const data = await listFeedItems(tab, cursorParam, viewerHash);
    return apiOk(data);
  } catch (error) {
    if (error instanceof ApiError) {
      return apiErr(error.code, error.messageKey, error.status, error.details);
    }
    console.error("[GET /api/feed error]", error);
    return apiErr("INTERNAL", "errors.internal", 500);
  }
}
