import { NextRequest } from "next/server";
import { RecoverMailboxSchema } from "@/lib/schemas";
import { recoverMailbox } from "@/lib/mailbox";
import { checkRateLimit } from "@/lib/ratelimit";
import { apiOk, apiErr, ApiError, getRateKey, parseJsonBody, rateLimitHeaders } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const rateKey = getRateKey(req);

    // 1. Rate limit by IP: 5 / 10m
    const rlIp = await checkRateLimit("recover_ip", rateKey);
    if (!rlIp.success) {
      return apiErr("RATE_LIMITED", "errors.rateLimited", 429, undefined, rateLimitHeaders(rlIp));
    }

    const input = await parseJsonBody(req, RecoverMailboxSchema);
    const usernameLower = input.username.toLowerCase();

    // 2. Rate limit by username: 10 / 1h
    const rlUser = await checkRateLimit("recover_user", usernameLower);
    if (!rlUser.success) {
      return apiErr("RATE_LIMITED", "errors.rateLimited", 429, undefined, rateLimitHeaders(rlUser));
    }

    const recovered = await recoverMailbox(input);

    const response = apiOk({
      name: recovered.name,
      username: recovered.username,
      accessToken: recovered.accessToken,
    });

    // Update session cookie with rotated access token
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    const isLocal = Boolean(host?.includes("localhost") || host?.includes("127.0.0.1"));
    response.cookies.set({
      name: `chithi_s_${usernameLower}`,
      value: recovered.accessToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" && !isLocal,
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
