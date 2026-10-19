import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { focusSessions, users } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { startSessionSchema } from "@/lib/validations/sessions";

// POST /api/sessions — start a new focus session
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = startSessionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
    }

    const { sessionType, label, roomId, plannedDurationSeconds } = parsed.data;
    const userId = session.user.id;

    // Abandon any existing active sessions first (idempotent safety)
    await db
      .update(focusSessions)
      .set({
        status: "abandoned",
        endedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(focusSessions.userId, userId),
          sql`${focusSessions.status} IN ('active', 'paused')`
        )
      );

    // If roomId provided, verify user is a member
    if (roomId) {
      const { roomMemberships } = await import("@/lib/db/schema");
      const [membership] = await db
        .select()
        .from(roomMemberships)
        .where(
          and(
            eq(roomMemberships.roomId, roomId),
            eq(roomMemberships.userId, userId)
          )
        )
        .limit(1);

      if (!membership) {
        return NextResponse.json({ error: "Not a member of this room" }, { status: 403 });
      }
    }

    const startedAt = new Date();
    const expectedEndAt = new Date(startedAt.getTime() + plannedDurationSeconds * 1000);

    const [newSession] = await db
      .insert(focusSessions)
      .values({
        userId,
        roomId: roomId || null,
        sessionType,
        label: label || null,
        startedAt,
        expectedEndAt,
        plannedDurationSeconds,
        status: "active",
      })
      .returning();

    return NextResponse.json({ session: newSession }, { status: 201 });
  } catch (err) {
    console.error("Start session error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET /api/sessions — get current active session
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [activeSession] = await db
    .select()
    .from(focusSessions)
    .where(
      and(
        eq(focusSessions.userId, session.user.id),
        sql`${focusSessions.status} IN ('active', 'paused')`
      )
    )
    .limit(1);

  return NextResponse.json({ session: activeSession || null });
}
