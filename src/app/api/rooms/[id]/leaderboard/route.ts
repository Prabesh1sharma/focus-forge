import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { focusSessions, roomMemberships, users } from "@/lib/db/schema";
import { eq, and, gte, sql, inArray } from "drizzle-orm";
import { getPeriodStart } from "@/lib/utils";

// GET /api/rooms/[id]/leaderboard?period=today|week|month|all
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
  const period = (searchParams.get("period") || "week") as "today" | "week" | "month" | "all";

  // Verify user is a room member
  const [membership] = await db
    .select()
    .from(roomMemberships)
    .where(
      and(
        eq(roomMemberships.roomId, roomId),
        eq(roomMemberships.userId, session.user.id)
      )
    )
    .limit(1);

  if (!membership) {
    return NextResponse.json(
      { error: "Join this room to view the leaderboard" },
      { status: 403 }
    );
  }

  // Determine period start
  const timezone = "UTC"; // Use UTC for server-side leaderboard consistency
  const periodStart = getPeriodStart(period, timezone);

  // Build base query for room members
  const members = await db
    .select({
      userId: roomMemberships.userId,
      role: roomMemberships.role,
      joinedAt: roomMemberships.joinedAt,
      username: users.username,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
    })
    .from(roomMemberships)
    .innerJoin(users, eq(users.id, roomMemberships.userId))
    .where(eq(roomMemberships.roomId, roomId));

  const memberUserIds = members.map((m) => m.userId);

  // For each member, get their focus stats in the period (regardless of roomId)
  const leaderboard = await Promise.all(
    members.map(async (member) => {
      const whereConditions = [
        eq(focusSessions.userId, member.userId),
        eq(focusSessions.status, "completed"),
        eq(focusSessions.sessionType, "focus"),
      ];

      if (periodStart) {
        whereConditions.push(gte(focusSessions.startedAt, periodStart));
      }

      const [stats] = await db
        .select({
          totalSeconds: sql<number>`COALESCE(SUM(${focusSessions.actualFocusSeconds}), 0)`,
          sessionCount: sql<number>`COUNT(*)`,
        })
        .from(focusSessions)
        .where(and(...whereConditions));

      return {
        userId: member.userId,
        username: member.username,
        displayName: member.displayName,
        avatarUrl: member.avatarUrl,
        role: member.role,
        totalSeconds: Number(stats?.totalSeconds ?? 0),
        sessionCount: Number(stats?.sessionCount ?? 0),
      };
    })
  );

  // Sort by total seconds descending, then username for tie-breaking
  leaderboard.sort((a, b) => {
    if (b.totalSeconds !== a.totalSeconds) return b.totalSeconds - a.totalSeconds;
    return a.username.localeCompare(b.username);
  });

  return NextResponse.json({ leaderboard, period });
}
