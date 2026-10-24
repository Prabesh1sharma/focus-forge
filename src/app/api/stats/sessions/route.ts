import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { focusSessions } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

// GET /api/stats/sessions?page=1&limit=5
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "5", 10) || 5));
  const offset = (page - 1) * limit;

  try {
    const rows = await db
      .select({
        id: focusSessions.id,
        label: focusSessions.label,
        startedAt: focusSessions.startedAt,
        actualFocusSeconds: focusSessions.actualFocusSeconds,
      })
      .from(focusSessions)
      .where(
        and(
          eq(focusSessions.userId, session.user.id),
          eq(focusSessions.status, "completed"),
          eq(focusSessions.sessionType, "focus")
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
        label: s.label,
        startedAt: s.startedAt.toISOString(),
        actualFocusSeconds: s.actualFocusSeconds,
      })),
      hasMore,
      page,
    });
  } catch (err) {
    console.error("Error fetching user sessions:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
