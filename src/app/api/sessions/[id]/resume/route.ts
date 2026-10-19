import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { focusSessions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// POST /api/sessions/[id]/resume
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: sessionId } = await params;

  const [focusSession] = await db
    .select()
    .from(focusSessions)
    .where(
      and(
        eq(focusSessions.id, sessionId),
        eq(focusSessions.userId, session.user.id)
      )
    )
    .limit(1);

  if (!focusSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (focusSession.status !== "paused") {
    return NextResponse.json(
      { error: `Cannot resume a session with status: ${focusSession.status}` },
      { status: 409 }
    );
  }

  const now = new Date();
  const additionalPaused = focusSession.lastPausedAt
    ? Math.floor((now.getTime() - focusSession.lastPausedAt.getTime()) / 1000)
    : 0;

  const [updated] = await db
    .update(focusSessions)
    .set({
      status: "active",
      pausedDurationSeconds: focusSession.pausedDurationSeconds + additionalPaused,
      lastPausedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(focusSessions.id, sessionId))
    .returning();

  return NextResponse.json({ session: updated });
}
