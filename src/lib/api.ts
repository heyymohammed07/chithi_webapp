import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiOk, ApiErr, ErrorCode } from "./types";
import { MAX_JSON_BODY_BYTES } from "./constants";
import { sha256 } from "./crypto";
import { env } from "./env";

export class ApiError extends Error {
  constructor(
    public code: ErrorCode,
    public messageKey: string,
    public status: number,
    public details?: Record<string, string[]>
  ) {
    super(messageKey);
    this.name = "ApiError";
  }
}

export function apiOk<T>(data: T, init?: ResponseInit): NextResponse<ApiOk<T>> {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "no-store");

  return NextResponse.json(
    { ok: true, data },
    {
      ...init,
      headers,
    }
  );
}

export function apiErr(
  code: ErrorCode,
  message: string,
  status: number,
  details?: Record<string, string[]>,
  extraHeaders?: Record<string, string>
): NextResponse<ApiErr> {
  const headers = new Headers(extraHeaders);
  headers.set("Cache-Control", "no-store");

  return NextResponse.json(
    {
      ok: false,
      error: {
        code,
        message,
        details,
      },
    },
    {
      status,
      headers,
    }
  );
}

/**
 * Derives a privacy-preserving viewer hash from IP + User Agent + IP_SALT.
 * Raw IP is never retained.
 */
export function getViewerHash(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded
    ? forwarded.split(",")[0]?.trim() ?? "unknown"
    : req.headers.get("x-real-ip") ?? "unknown";
  const userAgent = req.headers.get("user-agent") ?? "unknown";

  return sha256(`${ip}:${userAgent}:${env.IP_SALT}`).slice(0, 32);
}

/**
 * Defensive JSON body parser that strictly enforces MAX_JSON_BODY_BYTES
 * before and after parsing, and validates against a Zod schema.
 */
export async function parseJsonBody<TOutput, TInput = unknown>(
  req: Request,
  schema: z.ZodType<TOutput, z.ZodTypeDef, TInput>
): Promise<TOutput> {
  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_JSON_BODY_BYTES) {
    throw new ApiError("PAYLOAD_TOO_LARGE", "errors.payloadTooLarge", 413);
  }

  let text: string;
  try {
    text = await req.text();
  } catch {
    throw new ApiError("VALIDATION_FAILED", "errors.validation.invalidJson", 400);
  }

  if (text.length > MAX_JSON_BODY_BYTES) {
    throw new ApiError("PAYLOAD_TOO_LARGE", "errors.payloadTooLarge", 413);
  }

  let rawJson: unknown;
  try {
    rawJson = JSON.parse(text);
  } catch {
    throw new ApiError("VALIDATION_FAILED", "errors.validation.invalidJson", 400);
  }

  const result = schema.safeParse(rawJson);
  if (!result.success) {
    const flat = result.error.flatten();
    const details: Record<string, string[]> = {};
    for (const [field, errs] of Object.entries(flat.fieldErrors)) {
      if (Array.isArray(errs) && errs.length > 0) {
        details[field] = errs;
      }
    }
    throw new ApiError("VALIDATION_FAILED", "errors.validation.failed", 400, details);
  }

  return result.data;
}
