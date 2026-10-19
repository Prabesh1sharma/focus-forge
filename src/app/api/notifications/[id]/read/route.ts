import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

// PATCH /api/notifications/[id]/read
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.id, id),
        eq(notifications.recipientId, session.user.id),
        isNull(notifications.readAt)
      )
    );

  return NextResponse.json({ success: true });
}
