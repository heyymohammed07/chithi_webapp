import { NextRequest, NextResponse } from "next/server";
import { getLetter, deleteLetter } from "@/lib/letters";
import { requireMailboxOwner } from "@/lib/auth";
import { apiOk, apiErr, ApiError } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const url = new URL(req.url);
    const username = url.searchParams.get("username");

    if (!username) {
      throw new ApiError("VALIDATION_FAILED", "errors.validation.usernameRequired", 400);
    }

    const { mailbox } = await requireMailboxOwner(req, username);
    const letter = await getLetter(mailbox.usernameLower, id);

    if (letter.state === "locked") {
      return NextResponse.json(
        {
          ok: false,
          error: { code: "LOCKED", message: "errors.letterLocked" },
          data: {
            state: "locked",
            lock: {
              kind: letter.summary.lockKind,
              unlockAt: letter.summary.unlockAt,
              question: letter.summary.question,
              attemptsRemaining: letter.summary.attemptsRemaining,
            },
            summary: letter.summary,
          },
        },
        { status: 423 }
      );
    }

    return apiOk(letter);
  } catch (error) {
    if (error instanceof ApiError) {
      return apiErr(error.code, error.messageKey, error.status, error.details);
    }
    console.error("[GET /api/letters/[id] error]", error);
    return apiErr("INTERNAL", "errors.internal", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const url = new URL(req.url);
    const username = url.searchParams.get("username");

    if (!username) {
      throw new ApiError("VALIDATION_FAILED", "errors.validation.usernameRequired", 400);
    }

    const { mailbox } = await requireMailboxOwner(req, username);
    const result = await deleteLetter(mailbox.usernameLower, id);

    return apiOk(result);
  } catch (error) {
    if (error instanceof ApiError) {
      return apiErr(error.code, error.messageKey, error.status, error.details);
    }
    console.error("[DELETE /api/letters/[id] error]", error);
    return apiErr("INTERNAL", "errors.internal", 500);
  }
}
