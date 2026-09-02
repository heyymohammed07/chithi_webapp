import { NextRequest, NextResponse } from "next/server";
import { cleanupInactiveMailboxes, getMailbox, purgeInactiveMailbox } from "@/lib/mailbox";
import { getRedis } from "@/lib/redis";
import { keys } from "@/lib/keys";
import { MailboxRecord } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function checkCronAuth(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  const customHeader = req.headers.get("x-cron-secret");

  const isAuthorized =
    Boolean(cronSecret) &&
    (authHeader === `Bearer ${cronSecret}` || customHeader === cronSecret);

  return Boolean(isAuthorized);
}

export async function GET(req: NextRequest) {
  try {
    if (!checkCronAuth(req)) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized access to maintenance route." },
        { status: 401 }
      );
    }

    const purgedCount = await cleanupInactiveMailboxes();
    return NextResponse.json({ ok: true, purgedCount });
  } catch (error) {
    console.error("[GET /api/cron/cleanup error]", error);
    return NextResponse.json(
      { ok: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!checkCronAuth(req)) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized access to maintenance route." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { username, setAgeDays, action } = body;
    if (!username) {
      return NextResponse.json({ ok: false, error: "Username required" }, { status: 400 });
    }

    // Disallow destructive manual purge in production
    if (process.env.NODE_ENV === "production" && action === "purge") {
      return NextResponse.json(
        { ok: false, error: "Manual purge is prohibited in production." },
        { status: 403 }
      );
    }

    const redis = getRedis();
    const usernameLower = String(username).toLowerCase();

    if (action === "purge") {
      await purgeInactiveMailbox(usernameLower);
      return NextResponse.json({ ok: true, action: "purged" });
    }

    if (typeof setAgeDays === "number") {
      const raw = await redis.get<string | MailboxRecord>(keys.mailbox(usernameLower));
      if (!raw) {
        return NextResponse.json({ ok: false, error: "Mailbox not found" }, { status: 404 });
      }
      const mb: MailboxRecord = typeof raw === "string" ? JSON.parse(raw) : raw;
      mb.lastLoginAt = Date.now() - setAgeDays * 24 * 60 * 60 * 1000;
      await redis.set(keys.mailbox(usernameLower), JSON.stringify(mb));
      return NextResponse.json({ ok: true, action: "aged", lastLoginAt: mb.lastLoginAt });
    }

    const mb = await getMailbox(usernameLower);
    return NextResponse.json({ ok: true, mailbox: mb });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message }, { status: 500 });
  }
}
