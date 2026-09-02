# Chithi · চিঠি

> **Anonymous Ephemeral Letters** — Quiet thoughts that dissolve into the night.

A short-lived mailbox. Handwritten-feeling letters. Everything self-destructs when the clock runs out.

---

## 📜 Philosophy

Modern digital communication is loud, eternal, and indexed forever. **Chithi** (`চিঠি`, Bengali for *letter*) restores intentionality, warmth, and ephemerality:
- **No passwords, no profiles, no tracking.**
- **Hard Redis TTLs**: When the mailbox clock hits zero, everything dissolves into ash.
- **Physical tactile beauty**: Hand-crafted parchment, midnight, rose, and typewriter papers; wax seals; envelope-unfolding physics; and script-aware Bengali typography.
- **Benami Kham (বেনামী খাম)**: A public wall of anonymous letters that also expires within 48 hours.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router, Node.js runtime)
- **Language**: TypeScript (strict mode, `noUncheckedIndexedAccess`)
- **Styling**: Tailwind CSS + Custom Vintage Design System Tokens
- **Typography**: Playfair Display, Cinzel, Noto Serif Bengali, JetBrains Mono
- **Database & Storage**: Upstash Redis (with seamless in-memory fallback for local development)
- **Rate Limiting**: Upstash Ratelimit (sliding-window with in-memory fallback)
- **Validation & Sanitization**: Zod, sanitize-html, NFC Unicode normalization
- **Motion & Physics**: Framer Motion (with `prefers-reduced-motion` instantaneous fallbacks)
- **Postcard Export**: `html-to-image` at 1080×1920 with two-pass font rasterization

---

## 🚀 Quick Start (Zero Cloud Setup Required)

Chithi includes a **built-in in-memory Redis shim**, meaning you can clone and run it immediately on `localhost` without needing any external accounts or cloud credentials!

### 1. Install dependencies
```bash
pnpm install
```

### 2. Set up environment variables
Copy the example environment file:
```bash
cp .env.example .env.local
```

### 3. Start development server
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ⚙️ Environment Variables

| Variable | Required? | Default | Description |
|---|---|---|---|
| `UPSTASH_REDIS_REST_URL` | Optional in dev | `""` (in-memory) | Upstash Redis REST endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | Optional in dev | `""` (in-memory) | Upstash Redis REST token |
| `AUTH_PEPPER` | Required in prod | Dev default constant | SHA-256 pepper for access tokens & passcodes |
| `IP_SALT` | Required in prod | Dev default constant | Pepper for hashing viewer IPs in analytics & feed |
| `NEXT_PUBLIC_APP_URL` | Optional | `http://localhost:3000` | Canonical app URL for links |
| `NEXT_PUBLIC_DEFAULT_LOCALE` | Optional | `en` | Initial locale fallback (`en` or `bn`) |

---

## 🏗️ Architecture & Security Model

### 1. Redis Keyspace
All data is stored with native TTLs. Nothing survives mailbox expiry:
- `mb:<username>`: JSON MailboxRecord with hard TTL (12h, 24h, 3d, 7d).
- `mb_owner:<username>`: SHA-256 hashed access token + recovery passcode.
- `mb_letters:<username>`: Sorted set of letter IDs scored by creation timestamp.
- `ltr:<id>`: JSON LetterRecord.
- `bottle:active`: Active pool of open mailboxes accepting bottles.
- `feed:ids`: Sorted set of public letters expiring in 48 hours.
- `feed:trending`: Sorted set weighted by reactions: `hearts * 2 + heartCracks`.

### 2. Zero-Password Ownership
- On mailbox creation, a 256-bit cryptographically secure token is generated and stored in an `httpOnly` secure cookie.
- A 6-digit rejection-sampled passcode (no modulo bias) is shown once to the creator for recovery.
- Recovery via `/recover` rotates the access token atomically and clears previous sessions.

### 3. Plain Text & Content Sanitization
- All letter bodies, hints, and riddles are normalized to **Unicode NFC**.
- Strips all HTML entities and tags; letters are rendered with `white-space: pre-wrap`.
- Preserves Bengali **Zero Width Non-Joiner (ZWNJ, `\u200C`)** and **Zero Width Joiner (ZWJ, `\u200D`)** to ensure complex conjuncts (যুক্তাক্ষর) render accurately.
- URLs are automatically stripped and replaced with `[link removed]`.
- Max word length enforcement (60 characters) prevents layout breakage.

### 4. Abuse Prevention
- 3-strike reporting system automatically quarantines abusive letters and removes them from feeds.
- Flood limits prevent rapid automated sending to any single recipient.
- Sliding-window rate limiters on mailbox creation, letter submission, and passcode recovery.

---

## 🌐 Localization (English & বাংলা)

- Fully localized with idiomatic English and Bengali dictionaries (`en.ts`, `bn.ts`).
- Type-safe dictionary verification ensures zero missing keys.
- Numbers and timestamps automatically convert to Bengali numerals (`১২৩৪`) when the Bengali locale is active.

---

## 📦 Production Deployment (Vercel)

1. Connect your repository to Vercel.
2. In the Vercel Project Settings:
   - Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` from an Upstash Redis database.
   - Generate two random 64-character hex strings:
     ```bash
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     ```
     Set them as `AUTH_PEPPER` and `IP_SALT`.
   - Set `NEXT_PUBLIC_APP_URL` to your production domain (e.g. `https://chithi.app`).
3. Deploy! Next.js will compile the standalone production bundle with strict CSP and security headers.

---

## 📄 License

MIT © Chithi Contributors
