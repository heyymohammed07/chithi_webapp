import { NextRequest } from "next/server";
import { SendBottleSchema } from "@/lib/schemas";
import { sendBottle } from "@/lib/bottle";
import { checkRateLimit } from "@/lib/ratelimit";
import { apiOk, apiErr, ApiError, getRateKey, getViewerHash, parseJsonBody, rateLimitHeaders } from "@/lib/api";
import { getSessionUsername } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const rateKey = getRateKey(req);
    const viewerHash = getViewerHash(req);

    // Rate limit: 3 bottles per hour per IP (§10.1)
    const rl = await checkRateLimit("bottle", rateKey);
    if (!rl.success) {
      return apiErr("RATE_LIMITED", "errors.rateLimited", 429, undefined, rateLimitHeaders(rl));
    }

    const input = await parseJsonBody(req, SendBottleSchema);

    // Determine sender mailbox to avoid self-targeting
    let senderUsername = input.senderUsername?.toLowerCase()?.trim();
    if (!senderUsername) {
      senderUsername = getSessionUsername(req) ?? undefined;
    }

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
