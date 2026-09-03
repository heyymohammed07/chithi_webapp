import { test } from "vitest";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { keys } from "../src/lib/keys";
import { RESERVED_USERNAMES, USERNAME_REGEX } from "../src/lib/constants";
import { remainingTtlSeconds, TTL_GRACE_S } from "../src/lib/mailbox";
import { getRedis } from "../src/lib/redis";
import { createMailbox, getPublicMailbox, purgeInactiveMailbox } from "../src/lib/mailbox";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test("DATA-01: keys.mailbox(u) never collides with keys.activeIndex()", () => {
  const testHandles = [
    ...RESERVED_USERNAMES,
    "active",
    "idx",
    "name",
    "recover",
    "ltrs",
    "unread",
  ];

  const activeIdx = keys.activeIndex();
  assert.equal(activeIdx, "mb:idx:active");

  for (const u of testHandles) {
    const mbKey = keys.mailbox(u);
    assert.notEqual(
      mbKey,
      activeIdx,
      `Collision detected: keys.mailbox("${u}") === "${activeIdx}"`
    );
  }

  // Mathematically verify that USERNAME_REGEX cannot produce ":"
  // keys.activeIndex() contains ":" while legal usernames cannot contain ":"
  assert.equal(USERNAME_REGEX.test("idx:active"), false);
});

test("DATA-07: Build-time route shadowing guard (all src/app routes reserved)", () => {
  const appDir = path.resolve(__dirname, "../src/app");
  const entries = fs.readdirSync(appDir, { withFileTypes: true });

  const unreservedRoutes: string[] = [];

  for (const entry of entries) {
    const name = entry.name;

    // Ignore special Next.js files / layout components / dynamic segments
    if (
      name.startsWith("[") ||
      name.startsWith("(") ||
      name.startsWith("_") ||
      name === "layout.tsx" ||
      name === "page.tsx" ||
      name === "loading.tsx" ||
      name === "error.tsx" ||
      name === "global-error.tsx" ||
      name === "not-found.tsx" ||
      name === "globals.css" ||
      name === "fonts.ts"
    ) {
      continue;
    }

    // Extract route identifier
    const routeIdentifier = name.replace(/\.(tsx|ts|jsx|js|png|ico|jpg|svg|json|txt)$/, "").toLowerCase();

    const isReserved = RESERVED_USERNAMES.includes(
      routeIdentifier as (typeof RESERVED_USERNAMES)[number]
    );

    if (!isReserved) {
      unreservedRoutes.push(`${name} -> "${routeIdentifier}"`);
    }
  }

  assert.deepEqual(
    unreservedRoutes,
    [],
    `Found unreserved top-level routes under src/app that would be shadowed by usernames: ${unreservedRoutes.join(", ")}`
  );
});

test("DATA-02: remainingTtlSeconds floored at 1 and single source of truth", () => {
  const now = Date.now();

  // Future expiry
  assert.equal(remainingTtlSeconds({ expiresAt: now + 5000 }), 5);

  // Past expiry floored at 1
  assert.equal(remainingTtlSeconds({ expiresAt: now - 5000 }), 1);
  assert.equal(remainingTtlSeconds({ expiresAt: now }), 1);
});

test("DATA-05: Mailbox expiry and handle reclamation regression test", async () => {
  const redis = getRedis();
  const testUsername = "exp_test_user";

  // Clean up any previous state
  await purgeInactiveMailbox(testUsername);

  // 1. Create a 12h mailbox
  const created = await createMailbox({
    name: "Expiry Tester",
    username: testUsername,
    durationKey: "12h",
    gender: "unspecified",
  });

  assert.equal(created.username, testUsername);

  // Verify reservation key exists
  const reservation = await redis.get(keys.mailboxReservation(testUsername));
  assert.ok(reservation, "Reservation key should exist");

  // Verify public mailbox is accessible
  const publicMb = await getPublicMailbox(testUsername);
  assert.equal(publicMb.username, testUsername);
  assert.equal(publicMb.exists, true);

  // 2. Simulate complete expiry & purge
  await purgeInactiveMailbox(testUsername);

  // Assert getPublicMailbox throws 404 NOT_FOUND (not 410 GONE)
  await assert.rejects(
    async () => {
      await getPublicMailbox(testUsername);
    },
    (err: any) => {
      return err.code === "NOT_FOUND" && err.status === 404;
    },
    "Expected 404 NOT_FOUND after mailbox keys have expired and been purged"
  );

  // Assert creating a new mailbox with the exact same handle immediately succeeds (handle reclaimed)
  const recreated = await createMailbox({
    name: "New Owner",
    username: testUsername,
    durationKey: "24h",
    gender: "other",
  });

  assert.equal(recreated.username, testUsername);

  // Cleanup after test
  await purgeInactiveMailbox(testUsername);
});
