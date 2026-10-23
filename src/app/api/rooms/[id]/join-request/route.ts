import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { rooms, roomMemberships, roomJoinRequests, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { createNotification } from "@/lib/notifications";

// POST /api/rooms/[id]/join-request — request to join a room
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
    // Check if room exists
    const [room] = await db
      .select({ id: rooms.id, name: rooms.name, visibility: rooms.visibility, createdBy: rooms.createdBy })
      .from(rooms)
      .where(eq(rooms.id, roomId))
      .limit(1);

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // If room is public, just add user directly
    if (room.visibility === "public") {
      const [existingMembership] = await db
        .select()
        .from(roomMemberships)
        .where(
          and(
            eq(roomMemberships.roomId, roomId),
            eq(roomMemberships.userId, userId)
          )
        )
        .limit(1);

      if (!existingMembership) {
        await db.insert(roomMemberships).values({
          roomId,
          userId,
          role: "member",
        });
      }

      return NextResponse.json({ status: "joined", roomSlug: room.name });
    }

    // For private rooms, check if already a member
    const [existingMembership] = await db
      .select()
      .from(roomMemberships)
      .where(
        and(
          eq(roomMemberships.roomId, roomId),
          eq(roomMemberships.userId, userId)
        )
      )
      .limit(1);

    if (existingMembership) {
      return NextResponse.json({ error: "Already a member of this room" }, { status: 409 });
    }

    // Check for existing pending join request
    const [existingRequest] = await db
      .select()
      .from(roomJoinRequests)
      .where(
        and(
          eq(roomJoinRequests.roomId, roomId),
          eq(roomJoinRequests.userId, userId),
          eq(roomJoinRequests.status, "pending")
        )
      )
      .limit(1);

    if (existingRequest) {
      return NextResponse.json({ error: "Join request already pending" }, { status: 409 });
    }

    // Create join request
    const [joinRequest] = await db
      .insert(roomJoinRequests)
      .values({
        roomId,
        userId,
        status: "pending",
      })
      .returning();

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

    const [requester] = await db
      .select({ displayName: users.displayName, username: users.username })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    for (const owner of ownerMemberships) {
      await createNotification({
        recipientId: owner.userId,
        actorId: userId,
        type: "room_joined",
        title: "Join Request",
        message: `${requester?.displayName ?? "Someone"} requested to join "${room.name}"`,
        relatedEntityType: "room_join_request",
        relatedEntityId: joinRequest.id,
        actionUrl: `/rooms/${room.name}`,
      });
    }

    return NextResponse.json({ joinRequest, status: "requested" }, { status: 201 });
  } catch (err) {
    console.error("Join request error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}