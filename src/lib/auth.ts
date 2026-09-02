import { MailboxRecord } from "./types";
import { getRedis } from "./redis";
import { keys } from "./keys";
import { hashWithPepper, timingSafeEqual } from "./crypto";
import { ApiError } from "./api";
import { SEVEN_DAYS_MS } from "./constants";
import { purgeInactiveMailbox, touchMailboxLogin } from "./mailbox";

/**
 * Extracts authentication token from cookie or Authorization Bearer header.
 */
export function extractAuthToken(req: Request, usernameLower: string): string | null {
  const cookieHeader = req.headers.get("cookie");
  if (cookieHeader) {
    const cookieName = `chithi_s_${usernameLower}`;
    const match = cookieHeader
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${cookieName}=`));

    if (match) {
      const tokenVal = match.slice(cookieName.length + 1).trim();
      if (tokenVal) return decodeURIComponent(tokenVal);
    }
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    const tokenVal = authHeader.slice(7).trim();
    if (tokenVal) return tokenVal;
  }

  return null;
}

/**
 * Guard for all owner-only route operations. Throws typed ApiError on failures.
 */
export async function requireMailboxOwner(
  req: Request,
  username: string
): Promise<{ mailbox: MailboxRecord; token: string }> {
  const usernameLower = username.toLowerCase();
  const token = extractAuthToken(req, usernameLower);

  if (!token) {
    throw new ApiError("UNAUTHORIZED", "errors.unauthorized", 401);
  }

  const redis = getRedis();
  const rawMailbox = await redis.get<string | MailboxRecord>(keys.mailbox(usernameLower));

  if (!rawMailbox) {
    throw new ApiError("NOT_FOUND", "errors.mailboxNotFound", 404);
  }

  const mailbox: MailboxRecord =
    typeof rawMailbox === "string" ? JSON.parse(rawMailbox) : rawMailbox;

  // 7-day inactivity purge guard (§2.B)
  const lastActive = mailbox.lastLoginAt ?? mailbox.createdAt;
  if (Date.now() - lastActive > SEVEN_DAYS_MS) {
    await purgeInactiveMailbox(usernameLower);
    throw new ApiError("GONE", "errors.mailboxExpired", 410);
  }

  // Confirm mailbox is still within lifetime
  if (Date.now() > mailbox.expiresAt) {
    throw new ApiError("GONE", "errors.mailboxExpired", 410);
  }

  const incomingHash = hashWithPepper(token);
  const isValid = timingSafeEqual(incomingHash, mailbox.accessTokenHash);

  if (!isValid) {
    throw new ApiError("FORBIDDEN", "errors.forbidden", 403);
  }

  // Touch lastLoginAt and extend 7-day TTL (§1, §2.A)
  mailbox.lastLoginAt = Date.now();
  await touchMailboxLogin(usernameLower);

  return { mailbox, token };
}
