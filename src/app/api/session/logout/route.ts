import { NextRequest } from "next/server";
import { apiOk, apiErr } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const prefix = "chithi_s_";
    const cookiesToClear: string[] = [];

    let targetUsername: string | null = null;
    try {
      const body = await req.json();
      if (body?.username) {
        targetUsername = String(body.username).trim().toLowerCase();
      }
    } catch {
      // Empty body is valid (clear all sessions)
    }

    if (targetUsername) {
      cookiesToClear.push(`chithi_s_${targetUsername}`);
    } else {
      // Parse all chithi_s_* cookie names from incoming request
      for (const c of cookieHeader.split(";")) {
        const trimmed = c.trim();
        if (trimmed.startsWith(prefix)) {
          const eqIdx = trimmed.indexOf("=");
          if (eqIdx > prefix.length) {
            const cookieName = trimmed.slice(0, eqIdx).trim();
            if (cookieName && !cookiesToClear.includes(cookieName)) {
              cookiesToClear.push(cookieName);
            }
          }
        }
      }
    }

    const response = apiOk({ loggedOut: true });

    // Clear each session cookie on the response
    for (const name of cookiesToClear) {
      response.cookies.set({
        name,
        value: "",
        path: "/",
        maxAge: 0,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });
    }

    return response;
  } catch (error) {
    console.error("[POST /api/session/logout error]", error);
    return apiErr("INTERNAL", "errors.internal", 500);
  }
}
