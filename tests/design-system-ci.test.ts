import { test } from "vitest";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";

import { en } from "../src/i18n/en";
import { bn } from "../src/i18n/bn";

function walk(dir: string): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (file !== "node_modules" && file !== ".next") {
        results = results.concat(walk(fullPath));
      }
    } else if (/\.(tsx|ts|jsx|js|css)$/.test(file)) {
      results.push(fullPath);
    }
  }
  return results;
}

test("UX-01: Zero hardcoded hex colors in src/ outside canonical token registries", () => {
  const files = walk(path.join(process.cwd(), "src"));
  const violations: { file: string; matches: string[] }[] = [];

  for (const file of files) {
    const normalized = file.replace(/\\/g, "/");
    // Only canonical registries are permitted to define raw hex values
    if (
      normalized.endsWith("/src/app/globals.css") ||
      normalized.endsWith("/src/lib/theme.ts")
    ) {
      continue;
    }

    const content = fs.readFileSync(file, "utf8");
    const matches = content.match(/#[0-9a-fA-F]{3,8}/g);
    if (matches && matches.length > 0) {
      violations.push({ file: normalized, matches });
    }
  }

  assert.equal(
    violations.length,
    0,
    `Found hardcoded hex colors in non-registry files:\n${violations
      .map((v) => `  ${v.file}: ${v.matches.join(", ")}`)
      .join("\n")}`
  );
});

test("UX-02: Zero raw emoji codepoints in src/", () => {
  const files = walk(path.join(process.cwd(), "src"));
  const violations: { file: string; matches: string[] }[] = [];
  const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;

  for (const file of files) {
    const normalized = file.replace(/\\/g, "/");
    const content = fs.readFileSync(file, "utf8");
    const matches = content.match(emojiRegex);
    if (matches && matches.length > 0) {
      violations.push({ file: normalized, matches });
    }
  }

  assert.equal(
    violations.length,
    0,
    `Found raw emoji characters in src/:\n${violations
      .map((v) => `  ${v.file}: ${v.matches.join(", ")}`)
      .join("\n")}`
  );
});

test("UX-02: Strict key parity between en.ts and bn.ts dictionaries", () => {
  function getKeys(obj: any, prefix = ""): string[] {
    let keys: string[] = [];
    for (const k in obj) {
      const p = prefix ? `${prefix}.${k}` : k;
      if (typeof obj[k] === "object" && obj[k] !== null && !Array.isArray(obj[k])) {
        keys = keys.concat(getKeys(obj[k], p));
      } else {
        keys.push(p);
      }
    }
    return keys;
  }

  const enKeys = getKeys(en);
  const bnKeys = getKeys(bn);

  const missingInBn = enKeys.filter((k) => !bnKeys.includes(k));
  const missingInEn = bnKeys.filter((k) => !enKeys.includes(k));

  assert.deepEqual(missingInBn, [], "Keys present in en.ts but missing in bn.ts");
  assert.deepEqual(missingInEn, [], "Keys present in bn.ts but missing in en.ts");
  assert.equal(enKeys.length, bnKeys.length, "Total number of dictionary keys must match exactly");
});
