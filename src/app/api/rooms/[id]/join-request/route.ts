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
      .select({ id: rooms.id, name: rooms.name, slug: rooms.slug, visibility: rooms.visibility, createdBy: rooms.createdBy })
      .from(rooms)
      .where(eq(rooms.id, roomId))
      .limit(1);

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Check if already a member
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

    // Check for existing join request (any status)
    const [existingRequest] = await db
      .select()
      .from(roomJoinRequests)
      .where(
        and(
          eq(roomJoinRequests.roomId, roomId),
          eq(roomJoinRequests.userId, userId)
        )
      )
      .limit(1);

    // Check current membership status
    const [currentMembership] = await db
      .select()
      .from(roomMemberships)
      .where(
        and(
          eq(roomMemberships.roomId, roomId),
          eq(roomMemberships.userId, userId)
        )
      )
      .limit(1);

    if (existingRequest) {
      // If user is already a member, don't allow re-requesting
      if (currentMembership) {
        return NextResponse.json({ error: "Already a member of this room" }, { status: 409 });
      }

      if (existingRequest.status === "pending") {
        return NextResponse.json({ error: "Join request already pending" }, { status: 409 });
      }
      if (existingRequest.status === "accepted") {
        // If previously accepted but left the room, allow new request
        if (!currentMembership) {
          await db
            .update(roomJoinRequests)
            .set({ status: "pending", createdAt: new Date(), respondedAt: null, respondedBy: null })
            .where(eq(roomJoinRequests.id, existingRequest.id));
          
          const [joinRequest] = await db
            .select()
            .from(roomJoinRequests)
            .where(eq(roomJoinRequests.id, existingRequest.id))
            .limit(1);

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
            .select({ displayName: users.displayName })
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
              actionUrl: `/rooms/${room.slug}`,
            });
          }

          return NextResponse.json({ joinRequest, status: "requested" }, { status: 201 });
        }
        return NextResponse.json({ error: "Already a member of this room" }, { status: 409 });
      }
      if (existingRequest.status === "declined") {
        // Allow re-requesting after decline by updating existing request
        await db
          .update(roomJoinRequests)
          .set({ status: "pending", createdAt: new Date(), respondedAt: null, respondedBy: null })
          .where(eq(roomJoinRequests.id, existingRequest.id));
        
        const [joinRequest] = await db
          .select()
          .from(roomJoinRequests)
          .where(eq(roomJoinRequests.id, existingRequest.id))
          .limit(1);

        // Notify owner...
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
          .select({ displayName: users.displayName })
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
            actionUrl: `/rooms/${room.slug}`,
          });
        }

        return NextResponse.json({ joinRequest, status: "requested" }, { status: 201 });
      }
      if (existingRequest.status === "cancelled") {
        // Allow re-requesting after cancel by updating existing request
        await db
          .update(roomJoinRequests)
          .set({ status: "pending", createdAt: new Date(), respondedAt: null, respondedBy: null })
          .where(eq(roomJoinRequests.id, existingRequest.id));
        
        const [joinRequest] = await db
          .select()
          .from(roomJoinRequests)
          .where(eq(roomJoinRequests.id, existingRequest.id))
          .limit(1);

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
          .select({ displayName: users.displayName })
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
            actionUrl: `/rooms/${room.slug}`,
          });
        }

        return NextResponse.json({ joinRequest, status: "requested" }, { status: 201 });
      }
    }

    // Create join request (for both public and private rooms)
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
        actionUrl: `/rooms/${room.slug}`,
      });
    }

    return NextResponse.json({ joinRequest, status: "requested" }, { status: 201 });
  } catch (err) {
    console.error("Join request error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}