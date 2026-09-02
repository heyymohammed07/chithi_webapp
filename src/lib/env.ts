import { z } from "zod";

const isProd =
  process.env.NODE_ENV === "production" &&
  process.env.NEXT_PHASE !== "phase-production-build";

const DEV_DEFAULT_PEPPER = "chithi_dev_auth_pepper_constant_must_be_overridden_in_production_32b";
const DEV_DEFAULT_SALT = "chithi_dev_ip_salt_constant_must_be_overridden_in_production_32b";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  UPSTASH_REDIS_REST_URL: isProd
    ? z.string().url("UPSTASH_REDIS_REST_URL must be a valid URL in production")
    : z.string().url().optional().or(z.literal("")),
  UPSTASH_REDIS_REST_TOKEN: isProd
    ? z.string().min(1, "UPSTASH_REDIS_REST_TOKEN is required in production")
    : z.string().optional().or(z.literal("")),
  AUTH_PEPPER: isProd
    ? z.string().min(32, "AUTH_PEPPER must be at least 32 characters in production")
    : z.string().min(1).default(DEV_DEFAULT_PEPPER),
  IP_SALT: isProd
    ? z.string().min(16, "IP_SALT must be at least 16 characters in production")
    : z.string().min(1).default(DEV_DEFAULT_SALT),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_DEFAULT_LOCALE: z.enum(["en", "bn"]).default("en"),
});

const parsed = envSchema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  AUTH_PEPPER: isProd ? process.env.AUTH_PEPPER : (process.env.AUTH_PEPPER || DEV_DEFAULT_PEPPER),
  IP_SALT: isProd ? process.env.IP_SALT : (process.env.IP_SALT || DEV_DEFAULT_SALT),
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  NEXT_PUBLIC_DEFAULT_LOCALE: process.env.NEXT_PUBLIC_DEFAULT_LOCALE || "en",
});

if (!parsed.success) {
  const formattedErrors = parsed.error.format();
  console.error("FATAL: Invalid or missing environment configuration:\n", JSON.stringify(formattedErrors, null, 2));
  throw new Error("Startup validation failed: required environment variables are invalid or missing.");
}

if (!isProd && (!process.env.AUTH_PEPPER || !process.env.IP_SALT)) {
  console.warn(
    "[chithi] Using dev fallback constants for AUTH_PEPPER / IP_SALT. In production, provide random 32+ character secrets."
  );
}

export const env = parsed.data;
