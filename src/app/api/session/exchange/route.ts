import { NextRequest } from "next/server";
import { z } from "zod";
import { getRedis } from "@/lib/redis";
import { keys } from "@/lib/keys";
import { hashWithPepper, timingSafeEqual } from "@/lib/crypto";
import { apiOk, apiErr, ApiError, parseJsonBody } from "@/lib/api";
import { MailboxRecord } from "@/lib/types";
import { touchMailboxLogin } from "@/lib/mailbox";
import { usernameSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ExchangeSchema = z
  .object({
    username: usernameSchema,
    key: z.string().min(1, "errors.validation.keyRequired"),
  })
  .strict();

export async function POST(req: NextRequest) {
  try {
    const input = await parseJsonBody(req, ExchangeSchema);
    const usernameLower = input.username.toLowerCase();

    const redis = getRedis();
    const rawMailbox = await redis.get<string | MailboxRecord>(keys.mailbox(usernameLower));

    if (!rawMailbox) {
      throw new ApiError("NOT_FOUND", "errors.mailboxNotFound", 404);
    }

    const mailbox: MailboxRecord =
      typeof rawMailbox === "string" ? JSON.parse(rawMailbox) : rawMailbox;

    // Confirm mailbox is within lifetime
    if (Date.now() > mailbox.expiresAt) {
      throw new ApiError("GONE", "errors.mailboxExpired", 410);
    }

    const incomingHash = hashWithPepper(input.key.trim());
    const isValid = timingSafeEqual(incomingHash, mailbox.accessTokenHash);

    if (!isValid) {
      throw new ApiError("FORBIDDEN", "errors.forbidden", 403);
    }

    // Touch last active time (§PERF-02)
    await touchMailboxLogin(mailbox);

    // Calculate max-age in seconds
    const remainingSeconds = Math.max(1, Math.floor((mailbox.expiresAt - Date.now()) / 1000));
    const maxAge = Math.min(remainingSeconds, 7 * 24 * 3600);

    const response = apiOk({ exchanged: true });
    response.cookies.set({
      name: `chithi_s_${usernameLower}`,
      value: input.key.trim(),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge,
    });

    return response;
  } catch (error) {
    if (error instanceof ApiError) {
      return apiErr(error.code, error.messageKey, error.status, error.details);
    }
    console.error("[POST /api/session/exchange error]", error);
    return apiErr("INTERNAL", "errors.internal", 500);
  }
}
