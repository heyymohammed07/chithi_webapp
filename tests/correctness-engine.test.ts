import { test } from "vitest";
import assert from "node:assert/strict";

import { stripUrls, toPlainText, countGraphemes } from "../src/lib/sanitize";
import { getRedis } from "../src/lib/redis";
import { keys } from "../src/lib/keys";
import { createMailbox } from "../src/lib/mailbox";
import { sendLetter, getLetter, unlockLetter, listLetters, deleteLetter } from "../src/lib/letters";
import { sendBottle, selectBottleCandidate } from "../src/lib/bottle";
import { listFeedItems, pruneExpiredFeedItems } from "../src/lib/feed";
import { ApiError } from "../src/lib/api";

test("COR-05: URL stripper fixtures and Bengali preservation", () => {
  // Fixture 1: "I miss you.Me too" (unchanged)
  assert.equal(stripUrls("I miss you.Me too"), "I miss you.Me too");

  // Fixture 2: "see example.com/page" (stripped)
  assert.equal(stripUrls("see example.com/page"), "see [link removed]");

  // Fixture 3: "www.example.com" (stripped)
  assert.equal(stripUrls("www.example.com"), "[link removed]");

  // Fixture 4: "https://x.co" (stripped)
  assert.equal(stripUrls("https://x.co"), "[link removed]");

  // Fixture 5: Bengali sentence containing U+200C (ZWNJ preserved)
  const bengaliText = "আমি তোমাকে ভালোবাস\u200Cি এবং চিঠির কথা মনে পড়ে";
  const cleanedBengali = toPlainText(bengaliText);
  assert.ok(cleanedBengali.includes("\u200C"), "Expected ZWNJ (\\u200C) to be strictly preserved");

  // Fixture 6: 2000-character body containing 30 short links (no throw, length respected)
  const baseSentence = "This is a meaningful letter to my dear friend. ";
  const link = " https://x.co/short ";
  let longBody = "";
  for (let i = 0; i < 30; i++) {
    longBody += baseSentence + link;
  }
  while (longBody.length < 2000) {
    longBody += " extra words for length.";
  }
  longBody = longBody.slice(0, 2000);

  // Must not throw, and grapheme length must not exceed 2000
  const sanitized = toPlainText(longBody, 2000);
  assert.ok(countGraphemes(sanitized) <= 2000, "Expected sanitized length to not exceed maxChars");
});

test("COR-04: Sanitizer throws ApiError with VALIDATION_FAILED", () => {
  // String type validation
  assert.throws(
    () => {
      // @ts-expect-error testing invalid type
      toPlainText(12345);
    },
    (err: unknown) => {
      return err instanceof ApiError && err.code === "VALIDATION_FAILED" && err.status === 400;
    }
  );

  // Enormous payload
  const hugeString = "a".repeat(2000 * 6);
  assert.throws(
    () => {
      toPlainText(hugeString, 2000);
    },
    (err: unknown) => {
      return err instanceof ApiError && err.code === "VALIDATION_FAILED" && err.status === 400;
    }
  );
});

test.skipIf(!process.env.UPSTASH_TEST_URL)("COR-01 & COR-02 & COR-03: Atomic letter open, unread counter floor and typed LetterView", async () => {
  const redis = getRedis();
  const username = "engine_test_user";

  await createMailbox({
    username,
    name: "Engine Tester",
    durationKey: "24h",
    gender: "unspecified",
  });

  // Send a letter
  const { id: letterId } = await sendLetter(
    {
      recipient: username,
      body: "Secret letter for testing engine correctness.",
      paper: "parchment",
      stamp: "wax",
      hints: ["Clue 1"],
      burnAfterReading: false,
      isAnonymous: false,
      senderName: "Bidi\u202EImpersonator\u202D",
      mode: { kind: "none" },
    },
    "viewer_test_hash"
  );

  // Verify senderName was sanitized per COR-06
  const rawLetter = await redis.get<string>(keys.letter(letterId));
  assert.ok(rawLetter);
  const parsed = JSON.parse(rawLetter);
  assert.ok(!parsed.senderName.includes("\u202E"), "Bidi override should have been stripped from senderName");

  // Initial unread count should be 1
  const unreadBefore = Number((await redis.get(keys.mailboxUnread(username))) || 0);
  assert.equal(unreadBefore, 1);

  // Fetch letter via getLetter -> must return discriminated union LetterView with state: "open"
  const letterView = await getLetter(username, letterId);
  assert.equal(letterView.state, "open");
  assert.equal(letterView.letter.body, "Secret letter for testing engine correctness.");
  assert.ok(letterView.letter.openedAt !== null);

  // Unread counter decremented to 0
  const unreadAfter = Number((await redis.get(keys.mailboxUnread(username))) || 0);
  assert.equal(unreadAfter, 0);

  // Second open should NOT decrement below 0 (floor protection)
  await getLetter(username, letterId);
  const unreadAfterSecond = Number((await redis.get(keys.mailboxUnread(username))) || 0);
  assert.equal(unreadAfterSecond, 0);

  // Delete letter -> should not take counter negative
  await deleteLetter(username, letterId);
  const unreadAfterDelete = Number((await redis.get(keys.mailboxUnread(username))) || 0);
  assert.equal(unreadAfterDelete, 0);

  // Self-healing: listLetters should sync unread counter
  const { items: summaries } = await listLetters(username);
  assert.equal(summaries.length, 0);
  const healedUnread = Number((await redis.get(keys.mailboxUnread(username))) || 0);
  assert.equal(healedUnread, 0);
});

test.skipIf(!process.env.UPSTASH_TEST_URL)("COR-01 & COR-03: Riddle attempts ceiling and locked LetterView", async () => {
  const username = "riddle_test_user";

  await createMailbox({
    username,
    name: "Riddle Tester",
    durationKey: "24h",
    gender: "unspecified",
  });

  const { id: letterId } = await sendLetter(
    {
      recipient: username,
      body: "Super secret riddle content.",
      paper: "midnight",
      stamp: "topSecret",
      hints: [],
      burnAfterReading: false,
      isAnonymous: true,
      mode: {
        kind: "riddle",
        question: "What is 2 + 2?",
        answer: "four",
      },
    },
    "riddle_viewer"
  );

  // getLetter before solving -> must return state: "locked" with no body (COR-03)
  const lockedView = await getLetter(username, letterId);
  assert.equal(lockedView.state, "locked");
  assert.equal(lockedView.summary.lockKind, "riddle");
  assert.equal(lockedView.summary.question, "What is 2 + 2?");
  assert.equal(lockedView.summary.attemptsRemaining, 5);
  // @ts-expect-error body must not exist on locked summary
  assert.equal(lockedView.summary.body, undefined);

  // 4 wrong attempts
  for (let i = 1; i <= 4; i++) {
    await assert.rejects(
      async () => {
        await unlockLetter(username, letterId, `wrong_${i}`);
      },
      (err: unknown) => {
        return err instanceof ApiError && err.code === "WRONG_ANSWER";
      }
    );
  }

  // 5th wrong attempt -> ATTEMPTS_EXCEEDED
  await assert.rejects(
    async () => {
      await unlockLetter(username, letterId, "wrong_5");
    },
    (err: unknown) => {
      return err instanceof ApiError && err.code === "ATTEMPTS_EXCEEDED";
    }
  );

  // 6th attempt (even with correct answer) must be refused due to max attempts reached
  await assert.rejects(
    async () => {
      await unlockLetter(username, letterId, "four");
    },
    (err: unknown) => {
      return err instanceof ApiError && err.code === "ATTEMPTS_EXCEEDED";
    }
  );
});

test.skipIf(!process.env.UPSTASH_TEST_URL)("COR-07: Bottle pair guard is acquired atomically upon delivery", async () => {
  const redis = getRedis();
  const recipient = "bottle_recipient_1";
  const senderViewerHash = "sender_viewer_hash_unique";

  await createMailbox({
    username: recipient,
    name: "Bottle Receiver",
    durationKey: "24h",
    gender: "female",
  });

  const pairKey = keys.bottlePair(senderViewerHash, recipient);

  // Before sending, pair guard must NOT be held
  const pairBefore = await redis.get(pairKey);
  assert.equal(pairBefore, null);

  // Candidate selection must not acquire pair key
  const candidate = await selectBottleCandidate("female", senderViewerHash);
  assert.equal(candidate.recipient, recipient);
  const pairAfterSelect = await redis.get(pairKey);
  assert.equal(pairAfterSelect, null);

  // Send bottle
  const result = await sendBottle(
    {
      target: "female",
      body: "Hello across the ocean waves!",
      paper: "rainy",
      stamp: "memory",
      hints: [],
      isAnonymous: true,
    },
    senderViewerHash
  );
  assert.ok(result.delivered);

  // Now pair key MUST be acquired
  const pairAfterSend = await redis.get(pairKey);
  assert.ok(pairAfterSend !== null);

  // Second bottle immediately to same senderViewerHash should fail with BOTTLE_NO_MATCH because pair key is held
  await assert.rejects(
    async () => {
      await sendBottle(
        {
          target: "female",
          body: "Second message immediately!",
          paper: "rainy",
          stamp: "memory",
          hints: [],
          isAnonymous: true,
        },
        senderViewerHash
      );
    },
    (err: unknown) => {
      return err instanceof ApiError && err.code === "BOTTLE_NO_MATCH";
    }
  );
});

test("COR-08 & COR-09: Feed cursor cross-tab rejection and symmetric pruning", async () => {
  // Cross-tab cursor rejection
  await assert.rejects(
    async () => {
      await listFeedItems("trending", "latest:10", "viewer_hash");
    },
    (err: unknown) => {
      return err instanceof ApiError && err.code === "VALIDATION_FAILED";
    }
  );

  await assert.rejects(
    async () => {
      await listFeedItems("latest", "trending:5:feed_123", "viewer_hash");
    },
    (err: unknown) => {
      return err instanceof ApiError && err.code === "VALIDATION_FAILED";
    }
  );

  // Pruning
  const pruned = await pruneExpiredFeedItems();
  assert.equal(typeof pruned, "number");
});
