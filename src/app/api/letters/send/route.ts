import { NextRequest } from "next/server";
import { SendLetterSchema } from "@/lib/schemas";
import { sendLetter } from "@/lib/letters";
import { checkRateLimit } from "@/lib/ratelimit";
import { apiOk, apiErr, ApiError, getViewerHash, parseJsonBody } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const viewerHash = getViewerHash(req);
    const input = await parseJsonBody(req, SendLetterSchema);

    // Prevent Self-Letter Sending Guard (§3.2)
    const recipientLower = input.recipient.toLowerCase();
    const senderHeader = req.headers.get("x-sender-username")?.toLowerCase();
    if (senderHeader && senderHeader === recipientLower) {
      return new Response(
        JSON.stringify({ ok: false, error: "You cannot send a letter to your own mailbox." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const cookieHeader = req.headers.get("cookie");
    if (cookieHeader) {
      const selfCookiePattern = new RegExp(`(^|;\\s*)chithi_s_${recipientLower}=([^;]+)`);
      const match = cookieHeader.match(selfCookiePattern);
      if (match && match[2]) {
        return new Response(
          JSON.stringify({ ok: false, error: "You cannot send a letter to your own mailbox." }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // Rate limit: 8 / 10m on viewerHash + ":" + recipient (§10.1)
    const rateLimitKey = `${viewerHash}:${recipientLower}`;
    const rl = await checkRateLimit("send", rateLimitKey);
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

    const result = await sendLetter(input, viewerHash);
    return apiOk(result);
  } catch (error) {
    if (error instanceof ApiError) {
      return apiErr(error.code, error.messageKey, error.status, error.details);
    }
    console.error("[POST /api/letters/send error]", error);
    return apiErr("INTERNAL", "errors.internal", 500);
  }
}
