import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { roomJoinRequests, roomMemberships, rooms, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { createNotification } from "@/lib/notifications";

// POST /api/join-requests/[id]/respond
// Body: { action: "accept" | "decline" }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: joinRequestId } = await params;
  const userId = session.user.id;

  try {
    const body = await req.json();
    const { action } = body;

    if (!["accept", "decline"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Find the join request
    const [joinRequest] = await db
      .select()
      .from(roomJoinRequests)
      .where(eq(roomJoinRequests.id, joinRequestId))
      .limit(1);

    if (!joinRequest) {
      return NextResponse.json({ error: "Join request not found" }, { status: 404 });
    }

    // Verify user is owner or admin of the room
    const [membership] = await db
      .select()
      .from(roomMemberships)
      .where(
        and(
          eq(roomMemberships.roomId, joinRequest.roomId),
          eq(roomMemberships.userId, userId)
        )
      )
      .limit(1);

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return NextResponse.json({ error: "Only room owners and admins can respond to join requests" }, { status: 403 });
    }

    if (joinRequest.status !== "pending") {
      return NextResponse.json(
        { error: "Join request has already been responded to" },
        { status: 409 }
      );
    }

    const roomId = joinRequest.roomId;
    const requesterId = joinRequest.userId;

    if (action === "decline") {
      await db
        .update(roomJoinRequests)
        .set({ status: "declined", respondedAt: new Date(), respondedBy: userId })
        .where(eq(roomJoinRequests.id, joinRequestId));

      await createNotification({
        recipientId: requesterId,
        actorId: userId,
        type: "invitation_declined",
        title: "Join Request Declined",
        message: `${session.user.displayName} declined your join request`,
        relatedEntityType: "room",
        relatedEntityId: roomId,
      });

      return NextResponse.json({ status: "declined" });
    }

    // Accept: add user as member
    const [existingMembership] = await db
      .select()
      .from(roomMemberships)
      .where(
        and(
          eq(roomMemberships.roomId, roomId),
          eq(roomMemberships.userId, requesterId)
        )
      )
      .limit(1);

    if (!existingMembership) {
      await db.insert(roomMemberships).values({
        roomId,
        userId: requesterId,
        role: "member",
      });
    }

    await db
      .update(roomJoinRequests)
      .set({ status: "accepted", respondedAt: new Date(), respondedBy: userId })
      .where(eq(roomJoinRequests.id, joinRequestId));

    const [room] = await db
      .select({ name: rooms.name, slug: rooms.slug })
      .from(rooms)
      .where(eq(rooms.id, roomId))
      .limit(1);

    await createNotification({
      recipientId: requesterId,
      actorId: userId,
      type: "invitation_accepted",
      title: "Join Request Accepted",
      message: `Your request to join "${room?.name ?? "the room"}" was accepted`,
      relatedEntityType: "room",
      relatedEntityId: roomId,
      actionUrl: `/rooms/${room?.slug}`,
    });

    return NextResponse.json({ status: "accepted", roomSlug: room?.slug });
  } catch (err) {
    console.error("Respond to join request error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}