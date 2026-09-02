import { NextRequest } from "next/server";
import { SendBottleSchema } from "@/lib/schemas";
import { sendBottle } from "@/lib/bottle";
import { checkRateLimit } from "@/lib/ratelimit";
import { apiOk, apiErr, ApiError, getViewerHash, parseJsonBody } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const viewerHash = getViewerHash(req);

    // Rate limit: 3 bottles per hour per viewer hash (§10.1)
    const rl = await checkRateLimit("bottle", viewerHash);
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

    const input = await parseJsonBody(req, SendBottleSchema);

    // Check if sender has an active mailbox username header to avoid self-targeting
    const senderUsername = req.headers.get("x-sender-username")?.toLowerCase();

    const result = await sendBottle(input, viewerHash, senderUsername);
    return apiOk(result);
  } catch (error) {
    if (error instanceof ApiError) {
      return apiErr(error.code, error.messageKey, error.status, error.details);
    }
    console.error("[POST /api/bottle/send error]", error);
    return apiErr("INTERNAL", "errors.internal", 500);
  }
}
