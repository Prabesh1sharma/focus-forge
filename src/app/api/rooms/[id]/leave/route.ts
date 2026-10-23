import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { roomMemberships, rooms } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { createNotification } from "@/lib/notifications";

// POST /api/rooms/[id]/leave
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: roomId } = await params;
  const userId = session.user.id;

  try {
    // Check membership
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
      return NextResponse.json({ error: "Not a member of this room" }, { status: 404 });
    }

    // Prevent owner from leaving if they're the only owner
    if (membership.role === "owner") {
      const ownerCount = await db
        .select({ count: sql`count(*)` })
        .from(roomMemberships)
        .where(
          and(
            eq(roomMemberships.roomId, roomId),
            eq(roomMemberships.role, "owner")
          )
        );

      if (Number(ownerCount[0]?.count ?? 0) === 1) {
        return NextResponse.json(
          { error: "Cannot leave room as the only owner. Transfer ownership first or delete the room." },
          { status: 400 }
        );
      }
    }

    // Remove membership
    await db
      .delete(roomMemberships)
      .where(
        and(
          eq(roomMemberships.roomId, roomId),
          eq(roomMemberships.userId, userId)
        )
      );

    // Notify room owner/admins
    const ownerMemberships = await db
      .select({ userId: roomMemberships.userId })
      .from(roomMemberships)
      .where(
        and(
          eq(roomMemberships.roomId, roomId),
          eq(roomMemberships.role, "owner")
        )
      );

    const [room] = await db
      .select({ name: rooms.name })
      .from(rooms)
      .where(eq(rooms.id, roomId))
      .limit(1);

    for (const owner of ownerMemberships) {
      if (owner.userId !== userId) {
        await createNotification({
          recipientId: owner.userId,
          actorId: userId,
          type: "room_left",
          title: "Member Left",
          message: `${session.user.displayName} left "${room?.name ?? "the room"}"`,
          relatedEntityType: "room",
          relatedEntityId: roomId,
        });
      }
    }

    return NextResponse.json({ status: "left" });
  } catch (err) {
    console.error("Leave room error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}