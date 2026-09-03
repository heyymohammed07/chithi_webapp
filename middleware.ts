import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
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

  // Set noindex, nofollow and Referrer-Policy on mailbox pages
  const isMailboxPage =
    pathname !== "/" &&
    !pathname.startsWith("/api") &&
    !pathname.startsWith("/feed") &&
    !pathname.startsWith("/sitemap") &&
    !pathname.startsWith("/robots") &&
    !pathname.includes(".");

  if (isMailboxPage) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
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
