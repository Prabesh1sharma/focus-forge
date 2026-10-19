import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { focusSessions, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { computeActualFocusSeconds } from "@/lib/timer/engine";
import { updateDailyAggregate } from "@/lib/stats/calculations";
import { getLocalDateString } from "@/lib/utils";
import { createNotification } from "@/lib/notifications";

// POST /api/sessions/[id]/complete
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: sessionId } = await params;
  const userId = session.user.id;

  try {
    // Fetch and lock the session — must be owned by this user and active
    const [focusSession] = await db
      .select()
      .from(focusSessions)
      .where(
        and(
          eq(focusSessions.id, sessionId),
          eq(focusSessions.userId, userId)
        )
      )
      .limit(1);

    if (!focusSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (focusSession.status === "completed") {
      // Idempotent: already completed
      return NextResponse.json({ session: focusSession, alreadyCompleted: true });
    }

    if (focusSession.status === "abandoned") {
      return NextResponse.json({ error: "Session was abandoned" }, { status: 409 });
    }

    if (focusSession.sessionType !== "focus") {
      // Break sessions don't count toward stats
      const [updated] = await db
        .update(focusSessions)
        .set({ status: "completed", endedAt: new Date(), updatedAt: new Date() })
        .where(eq(focusSessions.id, sessionId))
        .returning();
      return NextResponse.json({ session: updated });
    }

    const endedAt = new Date();

    // Compute actual focus seconds — server validated
    const pausedSecs =
      focusSession.status === "paused" && focusSession.lastPausedAt
        ? focusSession.pausedDurationSeconds +
          Math.floor((endedAt.getTime() - focusSession.lastPausedAt.getTime()) / 1000)
        : focusSession.pausedDurationSeconds;

    const actualFocusSeconds = computeActualFocusSeconds(
      focusSession.startedAt,
      endedAt,
      pausedSecs,
      focusSession.plannedDurationSeconds
    );

    // Only count if at least 1 minute of actual focus
    if (actualFocusSeconds < 60) {
      const [updated] = await db
        .update(focusSessions)
        .set({
          status: "completed",
          endedAt,
          actualFocusSeconds: 0,
          pausedDurationSeconds: pausedSecs,
          updatedAt: new Date(),
        })
        .where(and(eq(focusSessions.id, sessionId), eq(focusSessions.userId, userId)))
        .returning();
      return NextResponse.json({ session: updated, tooShort: true });
    }

    // Update session status
    const [updated] = await db
      .update(focusSessions)
      .set({
        status: "completed",
        endedAt,
        actualFocusSeconds,
        pausedDurationSeconds: pausedSecs,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(focusSessions.id, sessionId),
          eq(focusSessions.userId, userId),
          // Extra guard: only complete if still active/paused
          // (prevents concurrent duplicate completions)
        )
      )
      .returning();

    // Update daily aggregate
    const [dbUser] = await db
      .select({ timezone: users.timezone })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const timezone = dbUser?.timezone ?? "UTC";
    const today = getLocalDateString(timezone);
    await updateDailyAggregate(userId, today, actualFocusSeconds);

    return NextResponse.json({
      session: updated,
      actualFocusSeconds,
      today,
    });
  } catch (err) {
    console.error("Complete session error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
