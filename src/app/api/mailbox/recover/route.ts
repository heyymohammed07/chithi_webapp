import { NextRequest } from "next/server";
import { RecoverMailboxSchema } from "@/lib/schemas";
import { recoverMailbox } from "@/lib/mailbox";
import { checkRateLimit } from "@/lib/ratelimit";
import { apiOk, apiErr, ApiError, getViewerHash, parseJsonBody } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const viewerHash = getViewerHash(req);

    // 1. Rate limit by viewer hash: 5 / 10m
    const rlIp = await checkRateLimit("recover_ip", viewerHash);
    if (!rlIp.success) {
      const retryAfter = Math.max(1, Math.ceil((rlIp.reset - Date.now()) / 1000));
      return apiErr(
        "RATE_LIMITED",
        "errors.rateLimited",
        429,
        undefined,
        {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(rlIp.limit),
          "X-RateLimit-Remaining": String(rlIp.remaining),
          "X-RateLimit-Reset": String(rlIp.reset),
        }
      );
    }

    const input = await parseJsonBody(req, RecoverMailboxSchema);
    const usernameLower = input.username.toLowerCase();

    // 2. Rate limit by username: 10 / 1h
    const rlUser = await checkRateLimit("recover_user", usernameLower);
    if (!rlUser.success) {
      const retryAfter = Math.max(1, Math.ceil((rlUser.reset - Date.now()) / 1000));
      return apiErr(
        "RATE_LIMITED",
        "errors.rateLimited",
        429,
        undefined,
        {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(rlUser.limit),
          "X-RateLimit-Remaining": String(rlUser.remaining),
          "X-RateLimit-Reset": String(rlUser.reset),
        }
      );
    }

    const recovered = await recoverMailbox(input);

    const response = apiOk({
      name: recovered.name,
      username: recovered.username,
      accessToken: recovered.accessToken,
    });

    // Update session cookie with rotated access token
    response.cookies.set({
      name: `chithi_s_${usernameLower}`,
      value: recovered.accessToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 86400, // Safe default maxAge
    });

    return response;
  } catch (error) {
    if (error instanceof ApiError) {
      return apiErr(error.code, error.messageKey, error.status, error.details);
    }
    console.error("[POST /api/mailbox/recover error]", error);
    return apiErr("INTERNAL", "errors.internal", 500);
  }
}
