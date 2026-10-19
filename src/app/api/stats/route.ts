import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getUserStats, getHeatmapData } from "@/lib/stats/calculations";

// GET /api/stats — get current user's statistics
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [user] = await db
    .select({
      timezone: users.timezone,
      dailyGoalMinutes: users.dailyGoalMinutes,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const stats = await getUserStats(session.user.id, user.timezone, user.dailyGoalMinutes);

  return NextResponse.json({ stats });
}
