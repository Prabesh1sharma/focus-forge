import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { focusSessions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// POST /api/sessions/[id]/abandon
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

  if (focusSession.status === "completed" || focusSession.status === "abandoned") {
    return NextResponse.json({ session: focusSession });
  }

  const [updated] = await db
    .update(focusSessions)
    .set({
      status: "abandoned",
      endedAt: new Date(),
      actualFocusSeconds: 0,
      updatedAt: new Date(),
    })
    .where(eq(focusSessions.id, sessionId))
    .returning();

  return NextResponse.json({ session: updated });
}
