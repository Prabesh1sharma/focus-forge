import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { eq, and, sql, desc, isNull } from "drizzle-orm";

// GET /api/notifications
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get("unread") === "true";
  const limit = Math.min(Number(searchParams.get("limit") || "20"), 50);
  const offset = Number(searchParams.get("offset") || "0");

  const conditions = [eq(notifications.recipientId, session.user.id)];
  if (unreadOnly) {
    conditions.push(isNull(notifications.readAt));
  }

  const [results, [{ count: unreadCount }]] = await Promise.all([
    db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(notifications)
      .where(
        and(
          eq(notifications.recipientId, session.user.id),
          isNull(notifications.readAt)
        )
      ),
  ]);

  return NextResponse.json({
    notifications: results,
    unreadCount: Number(unreadCount),
  });
}

// PATCH /api/notifications — mark all as read
export async function PATCH() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.recipientId, session.user.id),
        isNull(notifications.readAt)
      )
    );

  return NextResponse.json({ success: true });
}
