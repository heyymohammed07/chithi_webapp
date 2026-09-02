import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Coarse in-memory rate limiter for Edge
const ipRateMap = new Map<string, { count: number; resetTime: number }>();
const CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();

function checkGlobalRateLimit(ip: string): boolean {
  const now = Date.now();

  // Periodic cleanup of expired records
  if (now - lastCleanup > CLEANUP_INTERVAL) {
    for (const [key, record] of ipRateMap.entries()) {
      if (now > record.resetTime) {
        ipRateMap.delete(key);
      }
    }
    lastCleanup = now;
  }

  const record = ipRateMap.get(ip);
  if (!record || now > record.resetTime) {
    ipRateMap.set(ip, { count: 1, resetTime: now + 60_000 });
    return true;
  }

  if (record.count >= 120) {
    return false;
  }

  record.count += 1;
  return true;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Global coarse API rate limit (120 req / min per IP)
  if (pathname.startsWith("/api/")) {
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0]?.trim() ?? "unknown" : "unknown";

    if (!checkGlobalRateLimit(ip)) {
      return new NextResponse(
        JSON.stringify({
          ok: false,
          error: {
            code: "RATE_LIMITED",
            message: "errors.rateLimited",
          },
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": "60",
            "Cache-Control": "no-store",
          },
        }
      );
    }
  }

  const response = NextResponse.next();

  // Ensure locale cookie exists if not present
  const localeCookie = request.cookies.get("chithi_locale");
  if (!localeCookie) {
    response.cookies.set({
      name: "chithi_locale",
      value: "en",
      path: "/",
      sameSite: "lax",
    });
  }

  // Set Referrer-Policy on inbox
  if (pathname.startsWith("/inbox")) {
    response.headers.set("Referrer-Policy", "no-referrer");
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets
     */
    "/((?!_next/static|_next/image|favicon.ico|textures|og).*)",
  ],
};
