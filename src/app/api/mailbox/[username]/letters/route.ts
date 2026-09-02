import { NextRequest } from "next/server";
import { listLetters } from "@/lib/letters";
import { requireMailboxOwner } from "@/lib/auth";
import { apiOk, apiErr, ApiError } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    if (!username) {
      throw new ApiError("VALIDATION_FAILED", "errors.validation.usernameRequired", 400);
    }

    const { mailbox } = await requireMailboxOwner(req, username);
    const letters = await listLetters(mailbox.usernameLower);

    return apiOk({ letters });
  } catch (error) {
    if (error instanceof ApiError) {
      return apiErr(error.code, error.messageKey, error.status, error.details);
    }
    console.error("[GET /api/mailbox/[username]/letters error]", error);
    return apiErr("INTERNAL", "errors.internal", 500);
  }
}
