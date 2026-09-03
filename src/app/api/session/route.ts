import { NextRequest } from "next/server";
import { getRedis } from "@/lib/redis";
import { keys } from "@/lib/keys";
import { hashWithPepper, timingSafeEqual } from "@/lib/crypto";
import { MailboxRecord } from "@/lib/types";
import { apiOk, apiErr } from "@/lib/api";
import { USERNAME_REGEX } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface SessionItem {
  username: string;
  name: string;
  expiresAt: number;
  unreadCount: number;
}

export async function GET(req: NextRequest) {
  try {
    const redis = getRedis();
    const cookieHeader = req.headers.get("cookie") || "";
    const prefix = "chithi_s_";
    const foundCookies: Array<{ usernameLower: string; token: string }> = [];

    // Parse all chithi_s_* cookies from incoming request
    for (const c of cookieHeader.split(";")) {
      const trimmed = c.trim();
      if (trimmed.startsWith(prefix)) {
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx > prefix.length) {
          const rawName = trimmed.slice(prefix.length, eqIdx).trim().toLowerCase();
          const rawVal = trimmed.slice(eqIdx + 1).trim();
          if (rawName && rawVal && USERNAME_REGEX.test(rawName)) {
            const token = decodeURIComponent(rawVal);
            foundCookies.push({ usernameLower: rawName, token });
          }
        }
      }
    }

    // Optional Bearer token fallback for testing / headless clients
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    const authUser = req.nextUrl.searchParams.get("username")?.toLowerCase();
    if (authHeader && authUser && USERNAME_REGEX.test(authUser)) {
      const parts = authHeader.split(" ");
      if (parts.length === 2 && parts[0]?.toLowerCase() === "bearer" && parts[1]) {
        const token = parts[1].trim();
        if (!foundCookies.some((c) => c.usernameLower === authUser)) {
          foundCookies.push({ usernameLower: authUser, token });
        }
      }
    }

    const sessions: SessionItem[] = [];
    const now = Date.now();

    for (const item of foundCookies) {
      const rawMailbox = await redis.get<string | MailboxRecord>(keys.mailbox(item.usernameLower));
      if (!rawMailbox) continue;

      const mailbox: MailboxRecord =
        typeof rawMailbox === "string" ? JSON.parse(rawMailbox) : rawMailbox;

      // Skip expired mailboxes
      if (now > mailbox.expiresAt) continue;

      // Verify token
      const incomingHash = hashWithPepper(item.token);
      const isValid = timingSafeEqual(incomingHash, mailbox.accessTokenHash);
      if (!isValid) continue;

      // Read unread counter
      const rawUnread = await redis.get<number | string>(keys.mailboxUnread(item.usernameLower));
      const unreadCount = rawUnread !== null ? Math.max(0, parseInt(String(rawUnread), 10) || 0) : 0;

      sessions.push({
        username: mailbox.username,
        name: mailbox.name || mailbox.username,
        expiresAt: mailbox.expiresAt,
        unreadCount,
      });
    }

    // Resolve active session
    const preferredParam =
      req.nextUrl.searchParams.get("preferred")?.toLowerCase() ||
      req.headers.get("x-chithi-active")?.toLowerCase() ||
      null;

    let active: string | null = null;
    if (preferredParam && sessions.some((s) => s.username.toLowerCase() === preferredParam)) {
      active = preferredParam;
    } else if (sessions.length > 0 && sessions[0]?.username) {
      active = sessions[0].username.toLowerCase();
    }

    return apiOk({ sessions, active });
  } catch (error) {
    console.error("[GET /api/session error]", error);
    return apiErr("INTERNAL", "errors.internal", 500);
  }
}
