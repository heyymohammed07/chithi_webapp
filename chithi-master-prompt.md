# MASTER BUILD PROMPT — "Chithi" (চিঠি) · Anonymous Ephemeral Letters

> Paste this entire document as a single prompt. It is self-contained: every
> ambiguity is pre-resolved, every data structure is specified, every acceptance
> test is written. Do not ask clarifying questions — build to this spec.

---

## 0. ROLE & MISSION

You are a Principal Full-Stack Engineer **and** UI/UX Designer. Build a
complete, production-ready, secure, visually distinctive anonymous ephemeral
letter web app named **Chithi** (চিঠি — Bengali for "letter"), deployed on
Vercel with Upstash Redis as the only datastore.

Product thesis: a person creates a short-lived mailbox, shares its public link,
and receives anonymous handwritten-feeling letters. Everything self-destructs
when the clock runs out. No accounts, no passwords, no email, no tracking.

Emotional target: opening a physical letter at night. Quiet, nostalgic,
slightly melancholic. The UI must feel *authored*, not generated.

---

## 1. RULES OF ENGAGEMENT (non-negotiable)

1. **Output every file in full.** No `// ...rest unchanged`, no `TODO`, no
   placeholder components, no "implement this later". If a file is listed in
   the tree in §4, its complete contents must appear.
2. **The build must pass.** `pnpm tsc --noEmit` → 0 errors.
   `pnpm build` → success. `pnpm lint` → 0 errors. No `any` except where a
   third-party type forces it (and then with a one-line comment explaining why).
   No `@ts-ignore`. No `eslint-disable` without justification comment.
3. **Runs with zero cloud setup.** If `UPSTASH_REDIS_REST_URL` is absent, the
   app must transparently fall back to an in-process Redis shim (§5.6) so
   `pnpm dev` works immediately after `git clone`. Never crash on missing env.
4. **Server is the source of truth.** Every lock, timer, counter, and
   destruction rule is enforced server-side. Client code is presentation only.
   Assume the client is hostile and scripted.
5. **Never trust, never render HTML.** All user text is stored and rendered as
   plain text. See §9.
6. **Work in this order:** design tokens → types & Zod schemas → Redis data
   layer → API routes → hooks → components → pages → error/empty states →
   self-audit → commands. Do not start UI before the data layer compiles.
7. **Self-audit before finishing** against the checklist in §16, then state
   explicitly which items pass and which (if any) do not.

---

## 2. TECH STACK (pinned)

| Concern | Choice | Notes |
|---|---|---|
| Framework | Next.js 15 App Router | React 19, `src/` dir, TypeScript strict |
| Language | TypeScript 5.6+ | `strict: true`, `noUncheckedIndexedAccess: true` |
| Styling | Tailwind CSS 3.4 + CSS Modules | Tailwind for layout/spacing; CSS Modules only for paper textures, grain, envelope 3D |
| Animation | `framer-motion` 11 | Wrap in `LazyMotion` + `domAnimation`; respect `prefers-reduced-motion` |
| Icons | `lucide-react` | **Monochrome line icons only, `strokeWidth={1.25}`, `size={18\|20\|24}`.** Zero emoji anywhere in UI. Heart/broken-heart use Lucide `Heart` / `HeartCrack`, never `♥` glyph fallback |
| Data | `@upstash/redis` | REST client, edge-safe |
| Rate limit | `@upstash/ratelimit` | `Ratelimit.slidingWindow(n, "10 s")` form |
| Validation | `zod` 3 | Single source of truth for types via `z.infer` |
| Sanitize | `sanitize-html` | Pure-Node, no jsdom. Runs **only** in `runtime = "nodejs"` routes. Do **not** use DOMPurify (needs a DOM; breaks on Edge) |
| Image export | `html-to-image` | `toPng` with `pixelRatio` math in §14 |
| Dates | `date-fns` | Countdown formatting, no moment |
| IDs | `nanoid` + Web Crypto | See §8.1 |
| Package manager | pnpm | Lockfile committed |

Do not add libraries beyond this list. No state manager (React context is
enough), no UI kit, no `next-intl` (custom i18n per §13), no ORM.

### 2.1 Deployment target

Vercel. Constraints to honour:

- Route handlers default to `runtime = "nodejs"`. Only `middleware.ts` runs Edge.
- No filesystem writes, no in-memory cross-request state in production (the
  Redis shim in §5.6 is dev-only and must be documented as such).
- All secrets via env vars; nothing in `NEXT_PUBLIC_*` except locale default.
- `export const dynamic = "force-dynamic"` on inbox/feed pages — never cache
  personal or ephemeral data. Set `Cache-Control: no-store` on all API JSON.

---

## 3. DESIGN SYSTEM — "Vintage Dark Parchment"

### 3.1 Colour tokens

Define once in `tailwind.config.ts` **and** as CSS custom properties on
`:root` in `globals.css`. Never hardcode a hex outside these definitions.

```
ink            #0F0E11   canvas / deep espresso night
ink-raised     #1A191E   cards, modals, elevated surfaces
ink-hairline   #26242B   1px dividers, input borders at rest
wax            #B83B3B   primary accent, seals, destructive-warm
wax-dim        #8E2F2F    pressed/hover-dark state of wax
gold           #D4A373   secondary accent, focus ring, active border
gold-dim       #8A6B4C    disabled gold, subtle rules
ivory          #F0EDE6   primary text
ash            #8E8B94   secondary text, timestamps, placeholders
ash-dim        #5C5A62   tertiary/disabled text
success        #7A8C6A   sage — "letter sent"
warn           #C08A4E   amber — "expiring soon"
danger         #B83B3B   reuse wax for destructive
```

Contrast requirements (verify, do not assume): `ivory` on `ink` ≥ 14:1,
`ash` on `ink` ≥ 4.5:1, `gold` on `ink` ≥ 7:1, `ash-dim` used **only** for
non-essential decoration or ≥18px text. Focus ring is always `gold` at
2px offset 2px — never remove outlines.

### 3.2 Type scale & fonts (script-aware — this matters)

Load via `next/font/google` in `src/app/fonts.ts`, exposing CSS variables.
**Verified availability — do not deviate:**

- Latin display: `Playfair Display` (600/700) → `--font-display`
- Latin small-caps accent: `Cinzel` (400/600) → `--font-accent`
- Latin handwriting: `Caveat` (400/600) → `--font-hand`
- Latin typewriter: `Courier Prime` (400/700) → `--font-mono-paper`
- Latin UI body: `Inter` (400/500) → `--font-ui`
- **Bengali UI + body: `Hind Siliguri` (400/600) → `--font-bn-ui`**
- **Bengali letter/display: `Noto Serif Bengali` (400/600) → `--font-bn-paper`**

`Kalpurush` and `Charukola` are **not** on Google Fonts. If (and only if) the
repo contains `public/fonts/kalpurush.woff2`, register it with `next/font/local`
and prefer it for `--font-bn-paper`; otherwise fall back silently to
`Noto Serif Bengali`. Never emit a broken `@font-face`.

Critical rule: `Caveat`, `Playfair Display`, `Cinzel`, and `Courier Prime`
contain **no Bengali glyphs**. Every font stack must therefore be
`var(--font-hand), var(--font-bn-paper), serif` style — Latin font first,
Bengali font as the fallback that actually renders Bengali. When `locale === "bn"`,
swap heading stacks to lead with the Bengali family. Bengali text must never
render in tofu boxes or a mismatched system font.

Type scale (clamp-based, fluid): `display 2.25→3.5rem/1.1`,
`h1 1.75→2.25rem/1.2`, `h2 1.375→1.625rem/1.3`, `body 1rem/1.7`,
`small 0.875rem/1.6`, `micro 0.75rem/1.5 tracking-[0.08em] uppercase`
(micro is Cinzel/`--font-accent` for labels and metadata).
Letter body text is `1.0625rem/1.85` minimum — letters must breathe.

### 3.3 Space, radius, elevation, motion

- Spacing: 4px base; use only `4 8 12 16 24 32 48 64 96`.
- Radius: `2px` inputs, `4px` buttons, `10px` cards, `2px` envelope (paper is
  not rounded — sharp edges read as paper), `9999px` only for toggles/avatars.
- Elevation: no coloured shadows. Use `0 1px 0 rgba(212,163,115,0.06) inset`
  hairlines plus `0 24px 48px -24px rgba(0,0,0,0.7)` for modals only.
- Grain: one shared SVG `feTurbulence` noise overlay component at
  `opacity: 0.035`, `mix-blend-mode: soft-light`, `pointer-events: none`,
  `position: fixed`, `inset: 0`, `z-index: 1`. One instance app-wide, not per-card.
- Motion vocabulary (define as constants, reuse everywhere):
  `ease = [0.22, 1, 0.36, 1]`, durations `fast 0.18s`, `base 0.32s`,
  `slow 0.6s`, `envelope 0.9s`. Stagger children by `0.05s`.
  Every animated element must be wrapped so that
  `useReducedMotion() === true` collapses it to opacity-only or instant.

### 3.4 Anti-slop directives (design failure modes to avoid)

Do not produce: purple/blue gradient hero, glassmorphism blur cards,
neon glow, centre-aligned everything, three identical feature cards with
icon-title-blurb, `text-transparent bg-clip-text` gradient headings,
emoji in headings or buttons, generic "Get Started →" CTA, floating blobs,
Inter-only typography, or `shadow-2xl` on everything.
Do produce: asymmetric layouts, one bold serif focal point per screen,
generous negative space (min 96px between page sections on desktop),
hairline rules instead of boxes, wax-seal crimson used sparingly (< 5% of
pixels), and at most one accent colour per viewport.

---

## 4. REQUIRED FILE TREE

Produce exactly this structure. Every file complete.

```
chithi/
├── .env.example
├── .gitignore
├── README.md
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.mjs
├── tsconfig.json
├── package.json
├── middleware.ts
├── public/
│   ├── textures/grain.svg
│   └── og/default-og.png            (generate via next/og instead if simpler)
└── src/
    ├── app/
    │   ├── layout.tsx               root: fonts, providers, grain, skip-link
    │   ├── fonts.ts
    │   ├── globals.css
    │   ├── page.tsx                 landing + create-mailbox flow
    │   ├── error.tsx                vintage error screen (client)
    │   ├── global-error.tsx
    │   ├── not-found.tsx
    │   ├── loading.tsx
    │   ├── opengraph-image.tsx
    │   ├── recover/page.tsx         passcode recovery
    │   ├── u/[username]/
    │   │   ├── page.tsx             public write-a-letter page (server)
    │   │   ├── not-found.tsx        "this mailbox has faded"
    │   │   └── sent/page.tsx        confirmation screen
    │   ├── inbox/[username]/
    │   │   ├── page.tsx             private inbox (client-authed)
    │   │   └── loading.tsx
    │   ├── bottle/page.tsx          message in a bottle composer
    │   ├── feed/page.tsx            Benami Kham public wall
    │   ├── about/page.tsx           how it works + privacy + safety
    │   └── api/
    │       ├── mailbox/create/route.ts
    │       ├── mailbox/recover/route.ts
    │       ├── mailbox/[username]/route.ts        GET public meta
    │       ├── mailbox/settings/route.ts          PATCH bottle opt-in
    │       ├── letters/send/route.ts
    │       ├── letters/list/route.ts
    │       ├── letters/[id]/route.ts              GET open / DELETE
    │       ├── letters/[id]/unlock/route.ts       riddle answer
    │       ├── letters/[id]/react/route.ts
    │       ├── letters/[id]/publish/route.ts
    │       ├── bottle/send/route.ts
    │       ├── feed/route.ts
    │       ├── feed/[id]/react/route.ts
    │       └── report/route.ts
```

```
    ├── components/
    │   ├── ui/            Button, IconButton, Input, Textarea, Select,
    │   │                  Toggle, Modal, Tooltip, Toast, Tabs, Badge,
    │   │                  Spinner, Skeleton, CopyField, EmptyState
    │   ├── layout/        Header, LocaleToggle, Footer, GrainOverlay, PageShell
    │   ├── letter/        PaperSurface, LetterComposer, PaperPicker,
    │   │                  StampPicker, HintFields, AdvancedModePanel,
    │   │                  LetterPreview, CharCounter
    │   ├── envelope/      EnvelopeCard, EnvelopeOpenAnimation, WaxSeal,
    │   │                  LetterReader, LockedLetterGate, BurnTimer
    │   ├── inbox/         CountdownBanner, InboxToolbar, LetterActionBar,
    │   │                  BottleToggle, MailboxKeyCard
    │   ├── feed/          FeedGrid, FeedCard, FeedFilterTabs, ReactionButton
    │   ├── postcard/      PostcardCanvas, useDownloadPostcard
    │   └── system/        ErrorScreen, NotFoundScreen, ReportDialog
    ├── hooks/
    │   ├── useLocale.ts          i18n context consumer
    │   ├── useAccessToken.ts     localStorage token read/write/validate
    │   ├── useCountdown.ts       1s tick, SSR-safe, tab-blur tolerant
    │   ├── useApi.ts             typed fetch wrapper + error mapping
    │   ├── useToast.ts
    │   ├── useLocalReactions.ts  client-side dedup cache
    │   └── useReducedMotionSafe.ts
    ├── lib/
    │   ├── env.ts            Zod-validated env, dev-safe
    │   ├── redis.ts          client factory + dev shim (§5.6)
    │   ├── keys.ts           ALL Redis key builders (§5.1)
    │   ├── ratelimit.ts      named limiter instances (§10.1)
    │   ├── ids.ts            token/passcode/id generation (§8.1)
    │   ├── crypto.ts         sha256 hash + timingSafeEqual helpers
    │   ├── sanitize.ts       plain-text normaliser (§9.2)
    │   ├── schemas.ts        every Zod schema + inferred types
    │   ├── types.ts          domain types, enums, const maps
    │   ├── api.ts            response envelope + error codes (§7.1)
    │   ├── auth.ts           requireMailboxOwner() guard
    │   ├── letters.ts        letter read/write/lock-gate service
    │   ├── mailbox.ts        create/recover/settings service
    │   ├── bottle.ts         recipient matching (§12)
    │   ├── feed.ts           publish/list/react service
    │   ├── time.ts           duration maps, TTL math, formatting
    │   ├── paper.ts          paper style + stamp registries
    │   └── constants.ts      limits, caps, TTLs
    └── i18n/
        ├── en.ts
        ├── bn.ts
        ├── types.ts          Dict type derived from en.ts
        └── provider.tsx      LocaleProvider (client)
```

---

## 5. DATA MODEL — exact Redis keyspace

The original brief said "set a TTL on the account and everything vanishes."
That is **not how Redis works** — TTL is per key. This section is the corrected
design. Implement it exactly; all key strings come from `lib/keys.ts`.

### 5.1 Keys

| Key | Type | Contents | TTL |
|---|---|---|---|
| `mb:{username}` | JSON string | `MailboxRecord` (§5.2) | mailbox lifetime `L` |
| `mb:name:{usernameLower}` | string | `username` (reservation lock, prevents case-variant squatting) | `L` |
| `mb:recover:{usernameLower}` | string | `sha256(passcode + PEPPER)` | `L` |
| `ltr:{letterId}` | JSON string | `LetterRecord` (§5.3) | `min(L_remaining, letterTtl)` |
| `mb:ltrs:{username}` | ZSET | member `letterId`, score `createdAt` ms | `L` |
| `mb:unread:{username}` | string counter | integer | `L` |
| `bottle:pool:any` | ZSET | member `username`, score `expiresAt` ms | none (self-pruned) |
| `bottle:pool:male` / `:female` / `:other` | ZSET | same | none (self-pruned) |
| `feed:ids` | ZSET | member `feedId`, score `createdAt` ms | none (self-pruned) |
| `feed:trending` | ZSET | member `feedId`, score reaction total | none (self-pruned) |
| `feed:{feedId}` | JSON string | `FeedRecord` | 48h fixed |
| `react:ltr:{letterId}` | HASH | `{ heart: n, heartCrack: n }` | same as letter |
| `react:dedup:{feedId}:{viewerHash}` | string `1` | server-side dedup | 48h |
| `report:{targetType}:{targetId}` | HASH | `{count, firstAt, reasons}` | 7d |
| `rl:*` | managed by `@upstash/ratelimit` | — | library-managed |

`L` = mailbox lifetime in seconds from the chosen duration.

### 5.2 `MailboxRecord`

```ts
{
  username: string;            // display case as typed
  usernameLower: string;
  accessTokenHash: string;     // sha256(token + PEPPER) — raw token NEVER stored
  gender: "male" | "female" | "other" | "unspecified";
  acceptsBottles: boolean;     // default true
  createdAt: number;           // epoch ms
  expiresAt: number;           // epoch ms
  durationKey: "12h" | "24h" | "3d" | "7d";
  letterCount: number;
  version: 1;
}
```

### 5.3 `LetterRecord`

```ts
{
  id: string;                    // nanoid(16), URL-safe
  recipient: string;             // username (lowercased key owner)
  body: string;                  // sanitized plain text, 1..2000 chars
  paper: PaperStyleId;           // §11.1
  stamp: StampId;                // §11.2
  hints: string[];               // 0..3, each 1..60 chars
  source: "direct" | "bottle";
  createdAt: number;
  // locks
  lock:
    | { kind: "none" }
    | { kind: "capsule"; unlockAt: number }
    | { kind: "riddle"; question: string; answerHash: string; attempts: number;
        solvedAt: number | null }
  burnAfterReading: boolean;
  // lifecycle
  openedAt: number | null;       // set once, server-side, on first successful open
  burnAt: number | null;         // openedAt + 60_000 when burnAfterReading
  reaction: "heart" | "heartCrack" | null;  // recipient's reaction to sender
  published: boolean;            // posted to feed already (idempotence)
  version: 1;
}
```

### 5.4 `FeedRecord`

```ts
{
  id: string;                 // new nanoid — NOT the letter id (unlinkability)
  body: string;
  paper: PaperStyleId;
  stamp: StampId;
  createdAt: number;
  hearts: number;
  heartCracks: number;
  version: 1;
}
```

Publishing to the feed **strips**: recipient username, sender hints, lock
config, source, and the original letter id. Hints frequently contain
identifying details ("same college", "we met in Chittagong") — carrying them to
a public wall would deanonymize people. This is a hard requirement.

### 5.5 Expiry, atomicity, and orphan handling

1. **Letter TTL is clamped to the mailbox.** On write:
   `ttl = Math.max(1, Math.floor((mailbox.expiresAt - Date.now()) / 1000))`.
   A letter can never outlive its mailbox.
2. **ZSET members do not expire.** `mb:ltrs:{username}` will contain ids whose
   `ltr:*` keys are gone (burned, deleted, or clamped). Every list read must
   `MGET` the ids and treat `null` as "already vanished", then remove those
   members with a single `ZREM` in the same pipeline. Never surface a ghost.
3. **Bottle pools self-prune.** Before matching, run
   `ZREMRANGEBYSCORE bottle:pool:{g} 0 {now}` to evict expired mailboxes.
   Also `ZREM` any candidate whose `mb:*` key turns out to be missing.
4. **Feed indexes self-prune** the same way with a 48h cutoff score.
5. **Use pipelines** (`redis.pipeline()`) for every multi-key operation so a
   create is one round trip. Use `SET key val { nx: true, ex: L }` for username
   reservation — this is the only correct way to win the squatting race.
6. **Atomic reads that mutate** (first-open marking, burn scheduling, reaction
   counters) must use `INCR`/`HINCRBY` or a compare-and-set loop over
   `GET` → mutate → `SET key val { xx: true, keepTtl: true }`. Never
   read-modify-write without guarding against a concurrent open.
7. **Counters:** `mb:unread:{username}` via `INCR` on send, `DECR` clamped at 0
   on first open. Never recompute by scanning.
8. **No `KEYS`, no `SCAN`, no `FLUSHDB` anywhere.** Not in code, not in scripts.

### 5.6 Dev fallback shim (`lib/redis.ts`)

Export `getRedis(): RedisLike`. If both `UPSTASH_REDIS_REST_URL` and
`UPSTASH_REDIS_REST_TOKEN` are set → real `new Redis({...})`. Otherwise return
an in-process `Map`-backed shim implementing only the commands actually used
(`get set del incr decr expire ttl mget hincrby hgetall zadd zrem zrange
zrevrange zremrangebyscore zcard pipeline`), with real TTL semantics via stored
expiry timestamps checked lazily on read. Log once at startup:
`[chithi] No Upstash credentials — using in-memory store. Data resets on reload. Dev only.`
The shim must satisfy the same TypeScript interface as the real client so no
call site branches. Rate limiting in shim mode is a no-op that always allows,
but must log a warning.

---

## 6. LIMITS & CONSTANTS (`lib/constants.ts`)

```
USERNAME_MIN 3 · USERNAME_MAX 20 · regex /^[a-z0-9_](?:[a-z0-9_.-]{1,18})[a-z0-9_]$/i
  (no leading/trailing punctuation, no spaces, case-insensitive uniqueness)
RESERVED_USERNAMES  api, inbox, feed, bottle, about, recover, u, admin,
                    chithi, null, undefined, new, help, support, report
LETTER_BODY_MIN 1 · LETTER_BODY_MAX 2000
HINT_MAX_COUNT 3 · HINT_MAX_LEN 60
RIDDLE_Q_MAX 140 · RIDDLE_ANSWER_MIN 1 · RIDDLE_ANSWER_MAX 60
RIDDLE_MAX_ATTEMPTS 5          // then letter stays locked permanently
CAPSULE_MIN_LEAD_MS 60_000     // ≥1 min in future
CAPSULE_MAX_LEAD  = mailbox expiry (cannot unlock after mailbox dies — reject)
BURN_WINDOW_MS 60_000
MAILBOX_LETTER_CAP 300         // reject with 429-style code when full
FEED_PAGE_SIZE 24 · INBOX_PAGE_SIZE 20
DURATIONS { "12h": 43200, "24h": 86400, "3d": 259200, "7d": 604800 }
FEED_TTL_S 172800              // 48h
MAX_JSON_BODY_BYTES 16_384     // reject larger payloads before parsing
PASSCODE_LENGTH 6
```

Enforce `MAX_JSON_BODY_BYTES` by reading `content-length` and rejecting early,
plus a defensive check on the parsed string length.

---

## 7. API CONTRACT

### 7.1 Envelope & error codes

Every route returns JSON in this shape, always with
`Cache-Control: no-store`:

```ts
type ApiOk<T>  = { ok: true;  data: T }
type ApiErr    = { ok: false; error: { code: ErrorCode; message: string;
                                       details?: Record<string,string[]> } }
```

`message` is an **i18n key**, not prose (e.g. `errors.rateLimited`), so the
client renders it in the active locale. Never leak stack traces, Redis errors,
or key names to the client; log those server-side only.

| `ErrorCode` | HTTP | Meaning |
|---|---|---|
| `VALIDATION_FAILED` | 400 | Zod failure; `details` = flattened field errors |
| `PAYLOAD_TOO_LARGE` | 413 | body over cap |
| `UNAUTHORIZED` | 401 | missing/invalid access token |
| `FORBIDDEN` | 403 | token valid but not for this mailbox |
| `NOT_FOUND` | 404 | mailbox/letter/feed item gone or expired |
| `GONE` | 410 | existed but destroyed (burned / expired mid-session) |
| `LOCKED` | 423 | capsule not due, or riddle unsolved |
| `WRONG_ANSWER` | 422 | riddle answer incorrect (attempts remaining in data) |
| `ATTEMPTS_EXCEEDED` | 423 | riddle permanently locked |
| `USERNAME_TAKEN` | 409 | reservation lost |
| `MAILBOX_FULL` | 409 | letter cap reached |
| `BOTTLE_NO_MATCH` | 409 | no eligible recipient |
| `ALREADY_DONE` | 409 | duplicate publish/react |
| `RATE_LIMITED` | 429 | include `Retry-After` header |
| `INTERNAL` | 500 | anything else |

### 7.2 Routes

All `runtime = "nodejs"`, all `dynamic = "force-dynamic"`.
"Owner" = passes `requireMailboxOwner()` (§8.3).

**`POST /api/mailbox/create`** — public, rate-limited `create`.
In: `{ username, durationKey, gender? }`. Reserves name with `SET NX`, generates
token + passcode, stores hashes, adds to bottle pools, returns
`{ username, accessToken, recoveryPasscode, expiresAt, inboxUrl, publicUrl }`.
The raw token and passcode are returned **exactly once, never again**. Say so
in the UI. On reservation failure → `USERNAME_TAKEN`.

**`POST /api/mailbox/recover`** — public, rate-limited `recover` (strict: 5/10min
per IP **and** 10/hour per username, whichever trips first).
In: `{ username, passcode }`. Constant-time compare against stored hash.
On success, **rotate the access token** (issue new, overwrite `accessTokenHash`),
return the new token. Rotation prevents a leaked old token from persisting.
Failure response is identical for "no such mailbox" and "wrong passcode" —
no enumeration oracle. Never reveal remaining attempts.

**`GET /api/mailbox/[username]`** — public. Returns only
`{ username, exists: true, acceptsBottles, expiresAt }`. Nothing else. If absent
→ `NOT_FOUND` (which the public page renders as "this mailbox has faded").

**`PATCH /api/mailbox/settings`** — owner. In: `{ acceptsBottles }`.
Adds/removes the username from bottle pools accordingly.

**`POST /api/letters/send`** — public, rate-limited `send`.
In: `{ recipient, body, paper, stamp, hints?, mode }` where `mode` is a
discriminated union: `{kind:"none"}` | `{kind:"capsule", unlockAt}` |
`{kind:"riddle", question, answer}` and `burnAfterReading: boolean`.
Server: validate → sanitize → confirm mailbox alive → check letter cap →
hash riddle answer (never store plaintext) → write letter with clamped TTL →
`ZADD` index → `INCR` unread. Returns `{ id: string }` only — the sender gets
no read receipt and no way to poll the letter.

**`GET /api/letters/list?cursor=`** — owner. Returns envelope *summaries only*:
`{ id, stamp, paper, createdAt, source, hasHints, lockKind, unlockAt?,
   isOpened, burnAt, reaction, published }`.
**Never include `body` in the list response** — the body is fetched only on
open, so a locked or unopened letter's text never reaches the client early.

**`GET /api/letters/[id]`** — owner. The single most security-sensitive route.
Order of operations, strictly:
1. Load letter; missing → `NOT_FOUND`.
2. Confirm `letter.recipient === authed username`; else `FORBIDDEN`.
3. If `lock.kind === "capsule"` and `Date.now() < unlockAt` → `LOCKED` with
   `{ unlockAt }` and **no body**.
4. If `lock.kind === "riddle"` and not yet solved for this session → `LOCKED`
   with `{ question, attemptsLeft }` and **no body**.
5. If `burnAt !== null && Date.now() > burnAt` → `DEL` letter, `ZREM` index,
   return `GONE`.
6. First successful open: set `openedAt = now`, and if `burnAfterReading`,
   set `burnAt = now + 60_000` and shorten the key TTL to 60s via `EXPIRE`.
   Then `DECR` unread. This must be idempotent — a second open must not extend
   the burn window.
7. Return the full `LetterRecord` minus `answerHash`.

"Not yet solved" means `lock.solvedAt === null`. Solving is persisted on the
record (server-side), so it survives reloads — the client never holds the key.

**`POST /api/letters/[id]/unlock`** — owner, rate-limited `unlock`
(10 attempts / 10 min per token+letter). In: `{ answer }`.
Normalise both sides identically before comparing: trim, collapse internal
whitespace, `toLocaleLowerCase()`, strip trailing `?!.।`. Compare
`sha256(normalised + PEPPER)` with `crypto.timingSafeEqual`. On success set
`solvedAt` and return the body. On failure `HINCRBY`-style increment `attempts`;
at `RIDDLE_MAX_ATTEMPTS` return `ATTEMPTS_EXCEEDED` and refuse forever (the
letter stays in the inbox as a sealed curiosity — do not delete it).

**`DELETE /api/letters/[id]`** — owner. `DEL` + `ZREM` + clamp unread. Idempotent:
deleting an already-gone letter returns `ok: true`.

**`POST /api/letters/[id]/react`** — owner. In: `{ reaction: "heart"|"heartCrack" }`.
Sets `letter.reaction` (one per letter, replaceable) and `HINCRBY` the counter
hash. Because the sender is anonymous and has no inbox, this reaction is
*not* delivered anywhere — it is a keepsake state on the letter. Say this
honestly in the UI copy ("your reaction is kept with the letter"); do not
imply the sender is notified, because they cannot be.

**`POST /api/letters/[id]/publish`** — owner, rate-limited `publish`
(5 / hour per mailbox). Refuses if: `letter.published` (→ `ALREADY_DONE`),
letter is locked/unsolved, or `burnAfterReading` is true (burning letters must
never be publishable — that would defeat the sender's intent; return `FORBIDDEN`
with an explanatory i18n key). Creates a `FeedRecord` with a **fresh id**,
`ZADD` to `feed:ids` and `feed:trending` (score 0), 48h TTL, marks the letter
`published: true`.

**`POST /api/bottle/send`** — public, rate-limited `bottle` (stricter than
`send`: 3 / hour per IP). In: `{ body, paper, stamp, hints?, target }` where
`target ∈ {"anyone","male","female"}`. Matching per §12. Returns
`{ delivered: true }` with **no recipient identity**. On no match →
`BOTTLE_NO_MATCH` with copy inviting the sender to try later.

**`GET /api/feed?tab=trending|latest&cursor=`** — public, rate-limited `read`
(60 / min). `ZREVRANGE` the appropriate index, `MGET` bodies, prune ghosts,
return `{ items, nextCursor }`. Include `viewerHasReacted` computed from
`react:dedup:*` using the viewer hash (§10.2).

**`POST /api/feed/[id]/react`** — public, rate-limited `react` (30 / min).
In: `{ reaction }`. Server-side dedup: `SET react:dedup:{feedId}:{viewerHash} 1
NX EX 172800`; if the set fails, return `ALREADY_DONE` without incrementing.
On success `HINCRBY` and update `feed:trending` score to `hearts + heartCracks`.

**`POST /api/report`** — public, rate-limited `report` (10 / hour).
In: `{ targetType: "letter"|"feed", targetId, reason: enum, note?: string(≤300) }`.
Increments `report:{type}:{id}`. At 3 distinct reports on a feed item, remove it
from both feed indexes and delete the record immediately (auto-quarantine).
Log the event server-side. This is the only moderation lever in an app with no
accounts, so it must actually work, not be a no-op button.

---

## 8. IDENTITY & ACCESS CONTROL

### 8.1 Secret generation (`lib/ids.ts`)

- `accessToken`: `crypto.randomUUID()` is acceptable but prefer 32 bytes from
  `crypto.getRandomValues` base64url-encoded (256-bit) — a UUIDv4 is only 122
  bits and this is a bearer credential.
- `recoveryPasscode`: 6 digits via **rejection sampling** over
  `crypto.getRandomValues`, not `Math.random()` and not `% 1_000_000` (modulo
  bias). Zero-padded string, leading zeros preserved.
- `letterId` / `feedId`: `nanoid(16)` (URL-safe, ~95 bits — unguessable).
- Both secrets are stored **only as `sha256(secret + AUTH_PEPPER)`**. A Redis
  dump must not yield working credentials.

### 8.2 Token transport — corrected from the original brief

The original spec put the token in the URL: `/inbox/[username]?key=[token]`.
Keep that URL **as an entry point only**, because it is how a person restores
access on a new device. But fix its leakage:

1. On first load of `/inbox/[username]?key=…`, a client component immediately
   (a) POSTs the token to be exchanged for a session cookie, (b) writes it to
   `localStorage` under `chithi:token:{usernameLower}`, then
   (c) calls `router.replace('/inbox/{username}')` to **strip the token from the
   URL** so it stops appearing in history, screenshots, and `Referer` headers.
2. The exchange sets an `httpOnly`, `secure`, `sameSite: "lax"` cookie
   `chithi_s_{usernameLower}` containing the token, `maxAge` = mailbox lifetime.
   Subsequent API calls authenticate by cookie; the `Authorization: Bearer`
   header (from localStorage) is the fallback when the cookie is absent.
3. Add `<meta name="referrer" content="no-referrer" />` and
   `Referrer-Policy: no-referrer` for `/inbox/*`.
4. Add `<meta name="robots" content="noindex, nofollow" />` on `/inbox/*` and
   `/u/*`, plus a `robots.ts` disallowing both. Ephemeral private mail must not
   be indexed.

### 8.3 `requireMailboxOwner()` (`lib/auth.ts`)

Single guard used by every owner route. Signature:
`requireMailboxOwner(req, username): Promise<{ mailbox: MailboxRecord }>` —
throws a typed `ApiError`. Steps: read token from cookie → else Bearer header →
else `UNAUTHORIZED`. Load mailbox → missing → `NOT_FOUND`. Compare
`sha256(token + PEPPER)` to `mailbox.accessTokenHash` with `timingSafeEqual` →
mismatch → `FORBIDDEN`. Never compare with `===` on raw strings.

Route handlers must **never** re-implement this logic inline.

---

## 9. INPUT HANDLING & XSS

### 9.1 Principle

Chithi renders **no user HTML, ever**. There is no rich text, no markdown, no
links rendered as anchors. Letter bodies are plain text placed in React text
nodes (auto-escaped) with `white-space: pre-wrap` for line breaks. This removes
the entire XSS class rather than trying to filter it.

### 9.2 `lib/sanitize.ts` — `toPlainText(input: string): string`

Pipeline, in order:
1. Reject non-string / oversize before anything else.
2. Unicode normalise `NFC`.
3. Strip control chars except `\n` and `\t`. Write the class with escapes,
   never literal bytes: `/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g`.
4. Strip zero-width and bidi-override characters:
   `/[\u200B\u200E\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g`.
   **Critical exception:** `\u200C` (ZWNJ) and `\u200D` (ZWJ) are
   *linguistically required* in Bengali conjuncts. Preserve those two. A naive
   `\u200B-\u200D` strip silently corrupts Bengali words - do not do it.
5. `sanitize-html(input, { allowedTags: [], allowedAttributes: {} })` — turns any
   markup into text and decodes entities safely.
6. Collapse runs of >2 newlines to exactly 2; trim each line's trailing spaces;
   trim the whole string.
7. Enforce length **after** cleaning, so padding tricks can't bypass the cap.

Apply `toPlainText` to: letter body, hints, riddle question, report note.
Username gets a separate stricter validator (regex allowlist + reserved-word
check + `toLowerCase()` for the key). Never sanitize on the client and trust it.

### 9.3 Zod schemas (`lib/schemas.ts`)

One schema per endpoint, exported with `z.infer` types used by both the route and
the client `useApi` call — a single definition, no drift. Use
`z.discriminatedUnion("kind", …)` for letter modes. Use `.strict()` on every
object so unknown keys are rejected rather than silently ignored. Parse with
`safeParse` and map `error.flatten().fieldErrors` into `details`.

### 9.4 Security headers (`next.config.ts`)

`Content-Security-Policy` with `default-src 'self'`,
`img-src 'self' data: blob:`, `style-src 'self' 'unsafe-inline'`,
`font-src 'self' data:`, `connect-src 'self' https://*.upstash.io`,
`frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`.
Plus `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
`Referrer-Policy: no-referrer`, `Permissions-Policy: camera=(), microphone=(),
geolocation=()`, `Strict-Transport-Security` (prod only).
If `next/font` inlines styles requiring it, keep `'unsafe-inline'` for
`style-src` only — never for `script-src`. Document the CSP in the README.













---

## 10. RATE LIMITING & ABUSE PREVENTION

### 10.1 Limiters (`lib/ratelimit.ts`)

One `Ratelimit` instance per named bucket, each with its own `prefix`, using
`Ratelimit.slidingWindow(tokens, window)` and `Redis.fromEnv()`-equivalent from
`lib/redis.ts`. Enable `analytics: false` (privacy) and pass
`ephemeralCache: new Map()` so bursts are absorbed without extra round trips.

| Bucket | Limit | Identifier |
|---|---|---|
| `create` | 3 / 1 h | viewer hash |
| `send` | 8 / 10 m | viewer hash + `:` + recipient |
| `bottle` | 3 / 1 h | viewer hash |
| `recover` | 5 / 10 m | viewer hash; plus 10 / 1 h on `username` |
| `unlock` | 10 / 10 m | token hash + `:` + letterId |
| `publish` | 5 / 1 h | token hash |
| `react` | 30 / 1 m | viewer hash |
| `report` | 10 / 1 h | viewer hash |
| `read` | 60 / 1 m | viewer hash |

On rejection return `RATE_LIMITED` with headers `Retry-After`,
`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`. The client
shows a calm vintage notice with a countdown, never a raw 429.

Fail **open** on limiter infrastructure errors (log loudly), fail **closed**
on auth errors. Never let a Redis hiccup lock everyone out of reading letters.

### 10.2 Viewer hash (privacy-preserving identifier)

Raw IPs are personal data and must never be stored. Compute
`viewerHash = sha256(ip + userAgent + IP_SALT).slice(0, 32)`.
Derive `ip` from `x-forwarded-for` (first entry, trimmed) with fallback
`x-real-ip`, then `"unknown"`. Never log the raw IP. Document this in
`/about` under privacy.

### 10.3 Content abuse controls

- Reject bodies where a single "word" exceeds 60 chars (link/wall-of-text spam).
- Detect and strip URLs from letter bodies and hints by default: replace any
  `https?://…`, `www.…`, or bare `domain.tld/…` match with the i18n token
  `[link removed]`. Anonymous inbound links are a phishing vector with no
  legitimate use here. State this in the composer helper text.
- Reject a letter whose body is >70% identical to the previous letter from the
  same `viewerHash` to the same recipient inside 10 minutes (cheap flood guard:
  store `sha256(body)` at `flood:{viewerHash}:{recipient}` with 10m TTL and
  compare; exact-match check is sufficient, do not build fuzzy matching).
- `MAILBOX_LETTER_CAP` enforced on send.
- Report flow per §7.2 with auto-quarantine at 3 reports.
- Every page that displays user text shows a Report affordance (icon button,
  `Flag` icon) opening `ReportDialog`. Non-negotiable for an anonymous
  messaging product.

### 10.4 `middleware.ts` (Edge)

Scope: security headers, locale cookie pass-through, and a coarse global IP
limiter for `/api/*` (120 req / min). Do **not** put per-route business limits
here — those live in the handlers where the identifier is richer. Do not touch
Redis-heavy logic in middleware.

---

## 11. LETTER ENGINE

### 11.1 Paper styles (`lib/paper.ts` registry, CSS Modules for texture)

Each entry: `{ id, labelKey, fontVar, inkColor, cssModuleClass, previewSwatch }`.

| id | Look | Ink | Letter font |
|---|---|---|---|
| `parchment` | Aged warm cream, radial vignette, faint fibre noise, torn-ish top edge via mask | `#3A2E22` | `--font-hand` |
| `midnight` | Deep obsidian `#14131A`, subtle vertical sheen gradient | `#D4A373` | `--font-display` |
| `rose` | Soft blush `#F3E3E1`, single botanical line-art sprig bottom-right (inline SVG, 1.25px stroke, low opacity) | `#5C3B3B` | `--font-hand` |
| `typewriter` | Brownish `#E8DFC9` with 24px grid via repeating-linear-gradient | `#2E2A24` | `--font-mono-paper` |
| `rainy` | Translucent slate, `backdrop-filter: blur(6px)`, faint diagonal streak overlay | `#E6E9EE` | `--font-hand` |

Rules: textures are pure CSS/SVG — **no raster image assets, no external
image URLs**. Every paper must (a) meet 4.5:1 ink-on-paper contrast, (b) render
Bengali correctly via the script-aware stack in §3.2, (c) look right at both
composer size and 1080×1920 postcard size, and (d) degrade gracefully when
`backdrop-filter` is unsupported.

`PaperSurface` is one shared component taking `paper`, `children`,
`variant: "composer" | "reader" | "postcard" | "thumb"`. The same component
renders all four so a letter looks identical everywhere. Do not fork the markup.

### 11.2 Stamps (`StampId`)

`wax` (crimson seal with pressed `C` monogram), `topSecret` (Cinzel small-caps
rule-boxed label), `memory` (Lucide `Clock` in a gold hairline circle),
`heartbreak` (Lucide `HeartCrack` in a wax circle). All are inline SVG /
Lucide + CSS — no emoji, no colour images. Each has a 1.25px stroke and a
subtle rotation (`-3deg` to `4deg`, deterministic from letter id so it never
jitters on re-render).

### 11.3 Composer UX (`/u/[username]`)

Two-column on ≥1024px (paper preview left, controls right), stacked on mobile
with a sticky bottom action bar. Live preview updates as you type — the preview
*is* `PaperSurface variant="composer"`, not an approximation.

- Paper picker: horizontal swatch row, keyboard-navigable radiogroup.
- Stamp picker: same pattern.
- Hints: progressive disclosure — one field, "add another hint" appears after
  the first is non-empty, max 3, each removable.
- `CharCounter`: appears at 75% of cap, turns `warn` at 90%, `wax` at 100%.
  Counts **grapheme clusters** via `Intl.Segmenter` where available so Bengali
  conjuncts and emoji in *user text* count as one character, not several.
- Advanced modes in a single collapsible `AdvancedModePanel`; capsule and riddle
  are mutually exclusive (radio, not checkboxes — enforce in the Zod union too).
  Burn-after-reading is an independent switch and may be combined with either
  lock. It only blocks *publishing to the feed* (§7.2) - surface that
  consequence inline, before sending, not as a later error.
- Capsule picker: datetime-local input, clamped to
  `[now + 1 min, mailbox expiresAt]`, with a plain-language echo
  ("opens in 3 days, 4 hours — 2 hours before this mailbox closes").
  If the mailbox expires in under a minute, hide capsule mode entirely.
- Send: optimistic-free (wait for the server), then `router.push` to
  `/u/[username]/sent` showing a wax seal pressing animation and no letter text.

### 11.4 Envelope & reader (`/inbox/[username]`)

`EnvelopeCard` closed state: aged envelope shape, stamp in the top-right, wax
seal centred on the flap, `hasHints` shown as a small `Sparkles`-free gold
hairline tag reading "3 hints", relative timestamp in `ash`, and a lock badge
(`Clock` for capsule, `KeyRound` for riddle, `Flame` for burn) when applicable.
Unopened envelopes carry a 1px `gold` left border; opened ones drop to
`ink-hairline` and reduce opacity to 0.85.

Opening sequence (Framer Motion, `duration: 0.9s`, `ease` from §3.3):
1. Card lifts (`y: -4`, shadow grows) and the wax seal cracks — two halves
   rotate apart `±8deg` and fade.
2. Flap rotates open on `rotateX` from `0` to `-170deg` with
   `transformStyle: preserve-3d`, `transformOrigin: top`.
3. Paper slides up out of the pocket (`y: 24% → 0`) with a slight `scale`
   settle, then the reader modal takes over as a `layoutId`-shared element so
   the transition is continuous, not a cut.
4. `prefers-reduced-motion`: skip 1-3 entirely, cross-fade to the reader in
   0.18s. Test this path explicitly.

The animation must not begin until the `GET /api/letters/[id]` response is in
hand, so a `LOCKED` or `GONE` result never plays a fake open. On `LOCKED`, show
`LockedLetterGate` instead: capsule shows a live countdown to `unlockAt`;
riddle shows the question, an answer field, attempts remaining, and shake-on-wrong
feedback (opacity-only under reduced motion).

`BurnTimer`: when `burnAt` is set, a thin `wax` progress hairline drains across
the top of the reader over the remaining window with the seconds shown in
`--font-accent`. At zero, the letter visually chars/fades out (opacity + subtle
blur, 0.6s) and is removed from the list. The client must also treat a `GONE`
response as authoritative — the server, not this timer, decides.

### 11.5 Inbox chrome

- `CountdownBanner` (sticky top): mailbox lifetime remaining as
  `Dd HH:MM:SS`, driven by `useCountdown` on a 1s `setInterval` that
  recomputes from `expiresAt` (never decrements a local counter, so a
  backgrounded tab stays accurate). Turns `warn` under 1h, `wax` under 10m.
  At zero, replace the whole page with the "mailbox has faded" screen — do not
  keep showing stale letters.
- `MailboxKeyCard`: shown once after creation and re-openable from the toolbar.
  Contains public link, inbox link, and `CopyField`s. The recovery passcode is
  displayed **only** in the immediate post-creation state with explicit copy:
  "Write this down. It cannot be shown again." Never store the passcode in
  `localStorage`.
- `BottleToggle`: switch bound to `PATCH /api/mailbox/settings`, optimistic with
  rollback on failure.
- Empty state: centred hairline envelope illustration (inline SVG),
  "No letters yet", and a one-tap copy of the public link — the empty state's
  job is to get the link shared.

---

## 12. MESSAGE IN A BOTTLE — matching algorithm

Original brief said "system randomly picks an active user with matching
criteria." Specify it fully, because naive implementations either fail silently
or always pick the same person.

`selectBottleRecipient(target, senderViewerHash)`:

1. Choose pool key: `bottle:pool:any` for `target === "anyone"`, else
   `bottle:pool:{target}`. Users with `gender: "unspecified"` live only in
   `:any` and are therefore unreachable by gendered targeting — correct and
   intentional.
2. `ZREMRANGEBYSCORE pool 0 now` to prune dead mailboxes.
3. `ZCARD` → if 0, return `BOTTLE_NO_MATCH`.
4. Pick a random index in `[0, card)` and `ZRANGE pool idx idx` to get one
   candidate. **Do not fetch the whole set** — it does not scale and biases
   toward the head.
5. Reject and retry (max 5 attempts, then `BOTTLE_NO_MATCH`) if: the candidate's
   `mb:*` key is missing (`ZREM` it), `acceptsBottles === false` (`ZREM` from
   pools), the mailbox is at `MAILBOX_LETTER_CAP`, or the candidate has already
   received a bottle from this `senderViewerHash` in the last 24h (guard key
   `bottle:pair:{senderViewerHash}:{usernameLower}`, `SET NX EX 86400`).
6. Deliver via the same letter-write path with `source: "bottle"`.
   Bottle letters may carry hints but **must not** carry a riddle or capsule
   lock — the recipient has no relationship to the sender, so a puzzle they
   cannot solve is pure frustration. Reject those modes in the bottle schema.
7. Return only `{ delivered: true }`. Never reveal who received it, not even a
   masked hint. The sender-side UI says so plainly.

Also: a mailbox owner cannot receive their own bottle — exclude their own
username when the request carries a valid owner token, and rely on the pair
guard otherwise.

`/bottle` page: reuses `LetterComposer` with `target` selector
(`Anyone` / `Male` / `Female`) rendered as a segmented control with a short
honest explainer: "We'll hand this to one random open mailbox. You won't know
who. They won't know you." Gender targeting is a routing preference over
self-declared, optional data — never present it as verified, and never require
it at signup.

### 12.1 Note on the gender field

It is optional, self-declared, has an explicit "Prefer not to say" default
(`unspecified`), is used **only** for bottle routing, is never displayed
publicly, and is never returned by any public endpoint. Say this in one line in
the create flow and in `/about`. Do not add any other demographic field.

---

## 13. PUBLIC FEED — "Benami Kham" (`/feed`)

Masonry via CSS `columns` (`columns-1 sm:columns-2 lg:columns-3 gap-6`) with
`break-inside: avoid` on cards — no JS masonry library, no layout thrash.

`FeedCard`: `PaperSurface variant="thumb"` with the body clamped to ~12 lines and
a soft bottom fade mask, stamp, relative time, `ReactionButton` pair
(`Heart` / `HeartCrack`, both Lucide outline, filling with `wax` when reacted),
counts in `--font-accent`, and a `Flag` report button. Clicking the card opens
the full letter in a modal (reader chrome, no owner actions).

Filter tabs: `Trending` (by `feed:trending` score) and `Latest` (by `feed:ids`).
Tabs are real buttons in a `role="tablist"`, keyboard-operable, with the active
tab marked by a 1px `gold` underline — not a filled pill.

Reactions: dedup **both** client-side (`useLocalReactions` in `localStorage`,
instant optimistic feedback) **and** server-side (§7.2). The client cache is a
UX nicety; the server check is the actual rule. State this in a code comment so
nobody later removes the server check believing localStorage is sufficient.

Pagination: cursor-based (`?cursor=<score>`), "Read more letters" button rather
than infinite scroll — infinite scroll fights the contemplative mood and breaks
the footer. Show a `Skeleton` grid on first load and an `EmptyState`
("The wall is quiet tonight") when there is nothing.

---

## 14. POSTCARD EXPORT (`components/postcard/`)

Requirement: 9:16 social-ready PNG, high resolution, faithful to the paper.

`PostcardCanvas` renders off-screen at exactly `540×960` CSS px, positioned
`fixed; left: -10000px; top: 0` (never `display: none` — hidden elements
measure as zero and `html-to-image` produces a blank or clipped PNG).
Export with `toPng(node, { pixelRatio: 2, cacheBust: true, backgroundColor: <paper base> })`
→ final image `1080×1920`.

Non-obvious requirements that must be handled or the output will be broken:

1. **Fonts.** Call `await document.fonts.ready` before capture, and capture
   **twice**, discarding the first result — `html-to-image` commonly misses
   web fonts on the first pass because it inlines styles before fonts settle.
2. **No external resources.** All textures are CSS/inline SVG (§11.1), so there
   is nothing to taint the canvas. Do not introduce remote images.
3. **`backdrop-filter` does not rasterise.** For the `rainy` paper, the postcard
   variant must substitute an equivalent flat gradient + streak overlay.
   Verify visually rather than assuming parity.
4. Layout: 96px safe padding, letter body auto-scaling font size
   (start 30px, step down to a 20px floor until it fits without clipping —
   measure with `scrollHeight`, do not guess by character count), stamp
   top-right, a `Chithi · চিঠি` wordmark hairline-ruled at the bottom in
   `--font-accent`, and no recipient name and no hints on the image.
5. Filename: `chithi-<letterId-first-6>.png`. Trigger via an `<a download>`
   object URL, revoked after use.
6. Wrap in `useDownloadPostcard()` exposing `{ download, isExporting, error }`,
   with a toast on failure and a disabled button during export.

---

## 15. i18n ENGINE (EN / বাংলা)

- `src/i18n/en.ts` exports a deeply nested `const en = { … } as const`.
  `type Dict = typeof en`. `bn.ts` is typed `const bn: Dict` so **any missing
  Bengali key is a compile error**. This is the mechanism that guarantees the
  toggle never shows English fallback text mid-sentence.
- `LocaleProvider` (client) holds `locale` in state, persists to
  `localStorage("chithi:locale")` and a `chithi_locale` cookie (so the server
  can set `<html lang>` correctly on first paint), and exposes
  `{ locale, setLocale, t }`. `t` is a typed path accessor supporting
  `t("inbox.countdown.label")` and `t("feed.hearts", { count })`.
  Switching is pure state — **no navigation, no reload, no route segment**.
- `<html lang={locale === "bn" ? "bn" : "en"}>` and a `data-locale` attribute on
  `<body>` that CSS uses to swap font stacks (§3.2).
- `LocaleToggle` top-right: two text buttons `EN` / `বাং` separated by a hairline,
  active one in `ivory`, inactive in `ash`. `aria-pressed` on each. No flags,
  no globe icon, no dropdown.
- Every string in the app comes from the dictionary. Zero hardcoded UI text,
  including: placeholders, `aria-label`s, toast messages, error screens,
  validation messages, date/relative-time formatting (use `date-fns` locale
  `bn` where available, else format numerically), and the `metadata` title
  template. Numbers in Bengali locale render with
  `Intl.NumberFormat("bn-BD")` (Bengali digits) for counters and countdowns.
- Bengali copy must be real, idiomatic Bengali written by you — not
  transliteration and not machine-literal English word order. Product nouns
  worth getting right: চিঠি (letter), খাম (envelope), বেনামি খাম (anonymous
  envelope / the feed), ইনবক্স, সময় শেষ (time up), সিল (seal).

---

## 16. PAGES, STATES & COPY

Every page must implement all five states: **loading, empty, error, success,
and expired/gone.** A page without an expired state is incomplete, because
expiry is this product's core mechanic.

**`/` landing + create.** Above the fold: serif wordmark `Chithi` with `চিঠি` set
beneath in Bengali at 0.6 scale in `gold`, a one-line promise, and the create
form. Form fields: username (with live availability feedback debounced 400ms
against `GET /api/mailbox/[username]`, showing "available"/"taken" — this is a
deliberate, rate-limited enumeration tradeoff on *public* mailbox names, and is
fine because those names are meant to be shared), duration as four segmented
options with each option's absolute expiry echoed in plain language, and an
optional gender select defaulting to "Prefer not to say". Below the fold: a
three-step "how it works" told in prose with hairline dividers (not three
cards), and a link to `/feed`.
On success, replace the form in place with `MailboxKeyCard` — do not navigate
away before the person has copied their passcode.

**`/u/[username]`.** Server-renders the mailbox check. If absent →
`not-found.tsx` with "This mailbox has faded" and a CTA to create one. If alive,
show remaining lifetime as gentle context ("closes in 2 days") and the composer.
Never reveal letter count or any inbox contents here.

**`/u/[username]/sent`.** Wax seal press animation, "Your letter is on its way",
an honest note that it cannot be edited or recalled, and two actions: write
another, or create your own mailbox.

**`/inbox/[username]`.** Client-authed. Token resolution order: cookie →
`?key=` (then strip per §8.2) → `localStorage`. If none or invalid, render an
unauthorised screen offering `/recover` — never a blank page, never a redirect
loop. Contents: `CountdownBanner`, unread count, `InboxToolbar` (key card,
bottle toggle, locale), envelope list (newest first, `INBOX_PAGE_SIZE` per page),
reader modal, `LetterActionBar` (react, publish, download postcard, delete,
report). Destructive delete asks for confirmation in a modal; publish asks for
confirmation and states plainly that it is public for 48h and cannot be undone.

**`/recover`.** Username + 6-digit passcode with a segmented digit input
(one box per digit, paste-aware, numeric keypad on mobile). On success, store
the rotated token and go to the inbox. On failure, one neutral message; after
several failures, a calm "try again later" driven by the `Retry-After` header.

**`/bottle`.** Per §12.

**`/feed`.** Per §13.

**`/about`.** Prose: how it works, what is stored (and that no IP is stored in
raw form), what expiry means, that letters are unrecoverable once gone, that
gender is optional and used only for bottle routing, safety guidance for
recipients, and how reporting works. Written for a normal person, no legalese.

**`error.tsx` / `global-error.tsx` / `not-found.tsx`.** Vintage treatment: a
torn-paper hairline motif, `--font-display` heading, `ash` body, one `gold`
outline action. Copy: 404 → "This letter never arrived." Error → "The ink
smudged." Both include a reset/home action and no stack trace. `global-error.tsx`
must inline its own minimal styles since providers may not have mounted.

**Global.** `Header` (wordmark left, `LocaleToggle` right, hairline bottom
border, transparent over canvas), `Footer` (single hairline row: about, feed,
report, "letters vanish"), skip-to-content link, `GrainOverlay` mounted once,
`Toast` viewport `aria-live="polite"`.

---

## 17. ACCESSIBILITY & QUALITY BARS

- Keyboard: every interactive element reachable and operable; modals trap focus,
  restore it on close, and close on `Escape`; the envelope opens on `Enter`/`Space`
  from the card (it is a `button`, not a `div` with `onClick`).
- ARIA: `role="dialog" aria-modal="true"` with labelled titles; countdown wrapped
  in `aria-live="off"` (polite would spam screen readers every second) with a
  separate non-live text summary; toggles use real `<input type="checkbox">` or
  `role="switch"` with `aria-checked`.
- Contrast verified against §3.1, including ink-on-paper for all five papers.
- `prefers-reduced-motion` honoured everywhere (§3.3), including the burn
  animation and grain (grain is static, so it is fine).
- Touch targets ≥44×44px. Responsive at 360, 768, 1024, 1440.
- No layout shift on font load: use `display: "swap"` plus `adjustFontFallback`.
- Loading states use `Skeleton` shapes matching final layout, not spinners,
  except for button-level busy states.
- Zero console errors or React key warnings in dev.

---

## 18. ENVIRONMENT & CONFIG

`.env.example` (with comments, no real values):

```
# Upstash Redis (https://console.upstash.com -> Redis -> REST API)
# Leave both blank for local dev: the app falls back to an in-memory store.
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# 32+ random chars. Peppers the sha256 of access tokens and recovery passcodes.
# Rotating this invalidates every live mailbox. Generate:
#   node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
AUTH_PEPPER=

# 32+ random chars. Salts the viewer hash used for rate limiting and dedup.
IP_SALT=

# Public origin, used for building shareable links and OG metadata.
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: default locale, "en" or "bn"
NEXT_PUBLIC_DEFAULT_LOCALE=en
```

`lib/env.ts`: Zod schema over `process.env`, parsed **once** at module load.
`AUTH_PEPPER` and `IP_SALT` are required in production (`NODE_ENV === "production"`
→ `.min(32)`) and fall back to fixed dev-only constants otherwise, with a
one-time console warning. Upstash vars are optional (shim fallback). Export a
typed `env` object; no file outside `lib/env.ts` may read `process.env`.

Also produce a `README.md` covering: what the app is, local setup, the
in-memory-store caveat, Vercel deploy steps (create Upstash DB via the Vercel
integration or manually, set the four env vars, deploy), the Redis keyspace
table, the security model summary, and the abuse/reporting behaviour.

---

## 19. SELF-AUDIT — run before you finish

Go through this list explicitly and report pass/fail for each item. Fix
everything that fails. Do not claim completion while any box is unchecked.

**Build**
- [ ] `pnpm tsc --noEmit` → 0 errors. `pnpm build` → success. `pnpm lint` → clean.
- [ ] No file in §4 missing; no stubbed component; no `TODO`; no `any`; no
      `@ts-ignore`; every import resolves; no unused imports/exports.
- [ ] Every `use client` boundary is correct: hooks and Framer Motion only in
      client components; no client-only API (`localStorage`, `window`) touched
      during render or on the server.
- [ ] `next build` emits no dynamic-server-usage or hydration warnings.

**Data & correctness**
- [ ] Every Redis key written comes from `lib/keys.ts`. No `KEYS`/`SCAN`/`FLUSHDB`.
- [ ] Every letter TTL is clamped to the mailbox remainder.
- [ ] Ghost ids are pruned on every list read (letters, feed, bottle pools).
- [ ] Unread counter cannot go negative, and cannot be inflated by re-opening.
- [ ] Second open of a burn letter does not extend `burnAt`.
- [ ] Locked letters return no `body` in any response, including `/letters/list`.
- [ ] Riddle answers exist only as hashes; comparison is timing-safe.
- [ ] Publishing strips recipient, hints, locks, and the original letter id.
- [ ] Burn-after-reading letters cannot be published.

**Security**
- [ ] Raw tokens and passcodes are never stored, never logged, never returned
      after the create/recover response.
- [ ] `?key=` is stripped from the URL on first inbox load; cookie is
      `httpOnly` + `secure` + `sameSite=lax`.
- [ ] Every owner route calls `requireMailboxOwner`; try each with a valid token
      for a *different* mailbox and confirm `FORBIDDEN`.
- [ ] Recover returns identical responses for unknown username and wrong
      passcode; is rate-limited on both IP and username.
- [ ] No route echoes Redis errors, key names, or stack traces.
- [ ] CSP, `nosniff`, `no-referrer`, `noindex` on private routes all present.
- [ ] `<script>alert(1)</script>` submitted as a letter body renders as literal
      visible text in the reader, the feed, and the exported postcard.
- [ ] Bengali text containing ZWNJ/ZWJ survives sanitisation unchanged.
- [ ] Raw IPs appear nowhere in Redis or logs.

**Abuse**
- [ ] Every limiter in §10.1 exists and returns `Retry-After`.
- [ ] Limiter failure fails open; auth failure fails closed.
- [ ] URLs in bodies/hints are stripped; duplicate-flood guard works.
- [ ] Report exists on letters and feed cards; 3 reports quarantines a feed item.

**UX / design**
- [ ] All five paper styles render correctly in composer, reader, thumb, and
      postcard, in both languages.
- [ ] Postcard PNG is 1080×1920, fonts embedded, no clipped text, no blank output.
- [ ] Locale toggle switches every visible string with no reload and no missing key.
- [ ] `prefers-reduced-motion` path tested for envelope, burn, and page transitions.
- [ ] Loading, empty, error, and expired states exist on every page.
- [ ] Zero emoji in the UI; all icons Lucide at `strokeWidth={1.25}`.
- [ ] No element from the anti-slop list in §3.4 is present.
- [ ] Keyboard-only pass: create a mailbox, write a letter, open an envelope,
      solve a riddle, download a postcard, delete a letter.

**Manual end-to-end script (walk it and report results)**
1. Create mailbox `nishi`, 12h, unspecified gender. Copy token + passcode.
2. In a second browser profile, open `/u/nishi`, send a `parchment` letter with
   2 hints and burn-after-reading.
3. Send a second letter with a riddle lock; answer `bhalobasha`.
4. Send a third with a capsule unlocking 2 minutes out.
5. In the owner inbox: confirm unread = 3, open the burn letter, watch the 60s
   timer, confirm it disappears and a reload returns `GONE`.
6. Answer the riddle wrong 2×, then right; confirm the body appears and survives
   a reload without re-answering.
7. Confirm the capsule letter shows a countdown, no body in the network
   response, and opens after 2 minutes.
8. Publish the riddle letter to `/feed`; confirm hints and username are absent.
9. React on the feed twice from the same browser; confirm the count rises once.
10. Send a bottle to `Anyone`; confirm it lands in `nishi` and reveals nothing
    to the sender.
11. Download a postcard; open the PNG and check dimensions and fonts.
12. Toggle to বাংলা on every page; confirm no English leaks and no tofu glyphs.
13. Wait out (or manually expire) the mailbox; confirm inbox, public page, and
    letters all become "faded" and Redis holds no leftover keys.

---

## 20. COMMANDS TO OUTPUT AT THE END

Provide these verbatim as the final section of your response:

```bash
# 1. scaffold
pnpm create next-app@latest chithi --ts --tailwind --eslint --app --src-dir \
  --import-alias "@/*" --no-turbopack
cd chithi

# 2. dependencies
pnpm add @upstash/redis @upstash/ratelimit zod framer-motion lucide-react \
  html-to-image sanitize-html nanoid date-fns
pnpm add -D @types/sanitize-html

# 3. env
cp .env.example .env.local
# generate secrets:
node -e "console.log('AUTH_PEPPER=' + require('crypto').randomBytes(32).toString('base64url'))"
node -e "console.log('IP_SALT=' + require('crypto').randomBytes(32).toString('base64url'))"

# 4. verify
pnpm tsc --noEmit
pnpm lint
pnpm build

# 5. run
pnpm dev          # http://localhost:3000
```

Then a short Vercel deploy block:

```bash
pnpm dlx vercel link
pnpm dlx vercel env add UPSTASH_REDIS_REST_URL
pnpm dlx vercel env add UPSTASH_REDIS_REST_TOKEN
pnpm dlx vercel env add AUTH_PEPPER
pnpm dlx vercel env add IP_SALT
pnpm dlx vercel env add NEXT_PUBLIC_APP_URL
pnpm dlx vercel --prod
```

---

## 21. OUTPUT FORMAT FOR YOUR RESPONSE

1. One short paragraph: the architecture decisions you are locking in.
2. The file tree as built.
3. Every file, in dependency order (config → lib → i18n → hooks → components →
   app), each in its own fenced block headed by its exact path.
4. The completed §19 audit with pass/fail per item and any deviations named.
5. The §20 commands.

No preamble, no apologies, no "let me know if you want me to continue" — the
deliverable is the whole application in one response. If length forces a split,
finish the current file completely, then continue from the exact next file
without repeating anything.
