import { NextRequest } from "next/server";
import { CreateMailboxSchema } from "@/lib/schemas";
import { createMailbox } from "@/lib/mailbox";
import { checkRateLimit } from "@/lib/ratelimit";
import { apiOk, apiErr, ApiError, getViewerHash, parseJsonBody } from "@/lib/api";
import { env } from "@/lib/env";
import { DURATIONS } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const viewerHash = getViewerHash(req);

    // Rate limit: 3 creates per hour per viewer hash (§10.1)
    const rl = await checkRateLimit("create", viewerHash);
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

    const input = await parseJsonBody(req, CreateMailboxSchema);
    const created = await createMailbox(input);

    const baseUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
    const inboxUrl = `${baseUrl}/inbox/${created.username}?key=${encodeURIComponent(created.accessToken)}`;
    const publicUrl = `${baseUrl}/${created.username}`;

    const maxAgeSeconds = DURATIONS[input.durationKey];
    const usernameLower = created.username.toLowerCase();

    const response = apiOk({
      name: input.name.trim(),
      username: created.username,
      accessToken: created.accessToken,
      recoveryPasscode: created.recoveryPasscode,
      expiresAt: created.expiresAt,
      inboxUrl,
      publicUrl,
    });

    // Set authentication session cookie (§8.2)
    response.cookies.set({
      name: `chithi_s_${usernameLower}`,
      value: created.accessToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: maxAgeSeconds,
    });

    return response;
  } catch (error) {
    if (error instanceof ApiError) {
      return apiErr(error.code, error.messageKey, error.status, error.details);
    }
    console.error("[POST /api/mailbox/create error]", error);
    return apiErr("INTERNAL", "errors.internal", 500);
  }
}
