import crypto from "crypto";
import { z } from "zod";

const isBuildTimeOnly =
  process.env.npm_lifecycle_event === "build" &&
  process.env.VERCEL_ENV === undefined;

const isBrowser = typeof window !== "undefined";
const isVercelProd = process.env.VERCEL_ENV === "production";
const isProd = (process.env.NODE_ENV === "production" || isVercelProd) && !isBuildTimeOnly && !isBrowser;

// Ephemeral dev fallbacks generated at module load (never committed or persistent)
let devPepper = "dev-fallback-pepper-12345678901234567890123456789012";
let devSalt = "dev-fallback-salt-12345678901234567890123456789012";
if (!isProd && !isVercelProd && !isBrowser) {
  try {
    devPepper = crypto.randomBytes(32).toString("hex");
    devSalt = crypto.randomBytes(32).toString("hex");
  } catch {
    // fallback safe string
  }
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  VERCEL_ENV: z.enum(["production", "preview", "development"]).optional(),
  UPSTASH_REDIS_REST_URL: isProd && !isBrowser
    ? z.string().url("UPSTASH_REDIS_REST_URL must be a valid URL in production")
    : z.string().url().optional().or(z.literal("")),
  UPSTASH_REDIS_REST_TOKEN: isProd && !isBrowser
    ? z.string().min(1, "UPSTASH_REDIS_REST_TOKEN is required in production")
    : z.string().optional().or(z.literal("")),
  AUTH_PEPPER: isProd && !isBrowser
    ? z.string().min(32, "AUTH_PEPPER must be at least 32 characters in production")
    : z.string().min(32).default(devPepper),
  IP_SALT: isProd && !isBrowser
    ? z.string().min(32, "IP_SALT must be at least 32 characters in production")
    : z.string().min(16).default(devSalt),
  CRON_SECRET: isVercelProd && !isBrowser
    ? z.string().min(32, "CRON_SECRET must be at least 32 characters in production")
    : z.string().min(1).optional().or(z.literal("")),
  NEXT_PUBLIC_APP_URL: isProd
    ? z.string().url("NEXT_PUBLIC_APP_URL must be a valid URL")
    : z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_DEFAULT_LOCALE: z.enum(["en", "bn"]).default("en"),
});

const parsed = envSchema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  VERCEL_ENV: process.env.VERCEL_ENV,
  UPSTASH_REDIS_REST_URL: isBrowser ? "" : process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: isBrowser ? "" : process.env.UPSTASH_REDIS_REST_TOKEN,
  AUTH_PEPPER: process.env.AUTH_PEPPER || (isProd && !isBrowser ? undefined : devPepper),
  IP_SALT: process.env.IP_SALT || (isProd && !isBrowser ? undefined : devSalt),
  CRON_SECRET: process.env.CRON_SECRET,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || (isProd ? undefined : "http://localhost:3000"),
  NEXT_PUBLIC_DEFAULT_LOCALE: process.env.NEXT_PUBLIC_DEFAULT_LOCALE || "en",
});

if (!parsed.success) {
  const formattedErrors = parsed.error.format();
  console.error("FATAL: Invalid or missing environment configuration:\n", JSON.stringify(formattedErrors, null, 2));
  throw new Error("Startup validation failed: required environment variables are invalid or missing.");
}

if (!isProd && !isVercelProd && (!process.env.AUTH_PEPPER || !process.env.IP_SALT)) {
  console.warn(
    "[chithi] Using ephemeral in-memory secrets for AUTH_PEPPER / IP_SALT. Sessions will not survive a server restart. In production, provide random 32+ character secrets."
  );
}

export const env = parsed.data;
