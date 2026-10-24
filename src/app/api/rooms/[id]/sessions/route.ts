import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { focusSessions, roomMemberships, rooms, users } from "@/lib/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";

// GET /api/rooms/[id]/sessions?page=1&limit=5
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: roomId } = await params;
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "5", 10) || 5));
  const offset = (page - 1) * limit;

  try {
    // Check if room exists
    const [room] = await db
      .select({ id: rooms.id, visibility: rooms.visibility })
      .from(rooms)
      .where(eq(rooms.id, roomId))
      .limit(1);

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Check membership if room is private
    if (room.visibility === "private") {
      const [membership] = await db
        .select({ role: roomMemberships.role })
        .from(roomMemberships)
        .where(
          and(
            eq(roomMemberships.roomId, roomId),
            eq(roomMemberships.userId, session.user.id)
          )
        )
        .limit(1);

      if (!membership) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Get room members
    const members = await db
      .select({ userId: roomMemberships.userId })
      .from(roomMemberships)
      .where(eq(roomMemberships.roomId, roomId));

    const memberUserIds = members.map((m) => m.userId);
    if (memberUserIds.length === 0) {
      return NextResponse.json({ sessions: [], hasMore: false, page });
    }

    const rows = await db
      .select({
        id: focusSessions.id,
        userId: focusSessions.userId,
        label: focusSessions.label,
        startedAt: focusSessions.startedAt,
        actualFocusSeconds: focusSessions.actualFocusSeconds,
        username: users.username,
        displayName: users.displayName,
      })
      .from(focusSessions)
      .innerJoin(users, eq(users.id, focusSessions.userId))
      .where(
        and(
          eq(focusSessions.status, "completed"),
          eq(focusSessions.sessionType, "focus"),
          inArray(focusSessions.userId, memberUserIds)
        )
      )
      .orderBy(desc(focusSessions.startedAt))
      .limit(limit + 1)
      .offset(offset);

    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit);

    return NextResponse.json({
      sessions: items.map((s) => ({
        id: s.id,
        userId: s.userId,
        label: s.label,
        startedAt: s.startedAt.toISOString(),
        actualFocusSeconds: s.actualFocusSeconds,
        username: s.username,
        displayName: s.displayName,
      })),
      hasMore,
      page,
    });
  } catch (err) {
    console.error("Error fetching room sessions:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
