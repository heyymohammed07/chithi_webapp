import { NextRequest } from "next/server";
import { ReportSchema } from "@/lib/schemas";
import { reportContent } from "@/lib/feed";
import { checkRateLimit } from "@/lib/ratelimit";
import { apiOk, apiErr, ApiError, getViewerHash, parseJsonBody } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const viewerHash = getViewerHash(req);

    // Rate limit: 10 reports / hour per viewer hash (§10.1)
    const rl = await checkRateLimit("report", viewerHash);
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

    const input = await parseJsonBody(req, ReportSchema);
    const result = await reportContent(
      input.targetType,
      input.targetId,
      input.reason,
      input.note
    );

    return apiOk(result);
  } catch (error) {
    if (error instanceof ApiError) {
      return apiErr(error.code, error.messageKey, error.status, error.details);
    }
    console.error("[POST /api/report error]", error);
    return apiErr("INTERNAL", "errors.internal", 500);
  }
}
