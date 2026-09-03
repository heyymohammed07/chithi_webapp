import { test } from "vitest";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { NextRequest } from "next/server";

import { GET as getSessionRoute } from "../src/app/api/session/route";
import { createMailbox } from "../src/lib/mailbox";
import { getRedis } from "../src/lib/redis";
import { keys } from "../src/lib/keys";

test("UI-01: GET /api/session reads chithi_s_* cookies, validates tokens, and resolves active session", async () => {
  const user1 = "session_user_alpha";
  const user2 = "session_user_beta";

  const mb1 = await createMailbox({
    name: "User Alpha",
    username: user1,
    durationKey: "24h",
    gender: "male",
  });

  const mb2 = await createMailbox({
    name: "User Beta",
    username: user2,
    durationKey: "24h",
    gender: "female",
  });

  // Increment unread count for user1
  const redis = getRedis();
  await redis.incr(keys.mailboxUnread(user1));

  // Construct request with two session cookies (user1 and user2) + one bogus cookie
  const req = new NextRequest("http://localhost:3000/api/session?preferred=session_user_beta", {
    headers: {
      cookie: `chithi_s_${user1}=${mb1.accessToken}; chithi_s_${user2}=${mb2.accessToken}; chithi_s_bogus=invalid_token; other_cookie=xyz`,
    },
  });

  const res = await getSessionRoute(req);
  assert.equal(res.status, 200);

  const json = await res.json();
  assert.equal(json.ok, true);
  assert.ok(Array.isArray(json.data.sessions));
  assert.equal(json.data.sessions.length, 2, "Should discover exactly 2 valid sessions");

  const s1 = json.data.sessions.find((s: any) => s.username === user1);
  const s2 = json.data.sessions.find((s: any) => s.username === user2);
  assert.ok(s1, "User Alpha session must be present");
  assert.ok(s2, "User Beta session must be present");
  assert.equal(s1.unreadCount, 1, "User Alpha must have 1 unread message");
  assert.equal(s2.unreadCount, 0, "User Beta must have 0 unread messages");

  // Preferred was session_user_beta
  assert.equal(json.data.active, "session_user_beta", "Preferred session should be active");
});

test("UI-01: Zero document.cookie reads exist in entire src/ directory", async () => {
  function scanDir(dir: string): string[] {
    const results: string[] = [];
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        results.push(...scanDir(fullPath));
      } else if (/\.(ts|tsx|js|jsx)$/.test(file)) {
        results.push(fullPath);
      }
    }
    return results;
  }

  const srcFiles = scanDir(path.join(process.cwd(), "src"));
  const readViolations: string[] = [];

  for (const file of srcFiles) {
    const content = fs.readFileSync(file, "utf8");
    // Match document.cookie when NOT immediately followed by an assignment '='
    const lines = content.split("\n");
    lines.forEach((line, idx) => {
      if (line && line.includes("document.cookie") && !line.includes("document.cookie =")) {
        readViolations.push(`${file}:${idx + 1}: ${line.trim()}`);
      }
    });
  }

  assert.deepEqual(readViolations, [], `Found prohibited document.cookie reads: \n${readViolations.join("\n")}`);
});

test("UI-03: No hardcoded production domain vercel.app exists in src/ (except example docs)", async () => {
  function scanDir(dir: string): string[] {
    const results: string[] = [];
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        results.push(...scanDir(fullPath));
      } else if (/\.(ts|tsx|js|jsx)$/.test(file)) {
        results.push(fullPath);
      }
    }
    return results;
  }

  const srcFiles = scanDir(path.join(process.cwd(), "src"));
  const violations: string[] = [];

  for (const file of srcFiles) {
    const content = fs.readFileSync(file, "utf8");
    if (content.includes("https://mychithi.vercel.app")) {
      violations.push(file);
    }
  }

  assert.deepEqual(violations, [], `Hardcoded vercel.app domain found in: ${violations.join(", ")}`);
});

test("UI-04: useLetterNotifications gates polling on document.hidden and avoids emojis", async () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "src/hooks/useLetterNotifications.ts"),
    "utf8"
  );

  assert.ok(source.includes("visibilitychange"), "Must attach visibilitychange listener");
  assert.ok(source.includes("document.hidden"), "Must check document.hidden during interval ticks");
  assert.ok(!source.includes("💌"), "Must not include 💌 emoji in notification title");
});
