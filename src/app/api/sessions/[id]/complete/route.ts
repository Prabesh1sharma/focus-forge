import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { focusSessions, users } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { computeActualFocusSeconds } from "@/lib/timer/engine";
import { updateDailyAggregate } from "@/lib/stats/calculations";
import { getLocalDateString } from "@/lib/utils";

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
        .where(
          and(
            eq(focusSessions.id, sessionId),
            eq(focusSessions.userId, userId),
            // Atomic transition guard: only one request can flip the status
            sql`${focusSessions.status} IN ('active', 'paused')`
          )
        )
        .returning();
      if (!updated) {
        return NextResponse.json({ session: focusSession, alreadyCompleted: true });
      }
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
        .where(
          and(
            eq(focusSessions.id, sessionId),
            eq(focusSessions.userId, userId),
            sql`${focusSessions.status} IN ('active', 'paused')`
          )
        )
        .returning();
      if (!updated) {
        return NextResponse.json({ session: focusSession, alreadyCompleted: true });
      }
      return NextResponse.json({ session: updated, tooShort: true });
    }

    // Update session status. The status guard makes this a single-winner
    // transition: concurrent completions get zero rows back and must not
    // touch the daily aggregate below.
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
          sql`${focusSessions.status} IN ('active', 'paused')`
        )
      )
      .returning();

    if (!updated) {
      return NextResponse.json({ session: focusSession, alreadyCompleted: true });
    }

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
