import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { roomInvitations, roomMemberships, rooms } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { createNotification } from "@/lib/notifications";

// POST /api/invitations/[inviteId]/respond
// Body: { action: "accept" | "decline" }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ inviteId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { inviteId } = await params;
  const userId = session.user.id;

  try {
    const body = await req.json();
    const { action } = body;

    if (!["accept", "decline"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Find the invitation addressed to the current user; room is derived
    // server-side from the invitation record.
    const [invitation] = await db
      .select()
      .from(roomInvitations)
      .where(
        and(
          eq(roomInvitations.id, inviteId),
          eq(roomInvitations.inviteeId, userId)
        )
      )
      .limit(1);

    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    const roomId = invitation.roomId;

    if (invitation.status !== "pending") {
      return NextResponse.json(
        { error: "Invitation has already been responded to" },
        { status: 409 }
      );
    }

    if (action === "decline") {
      await db
        .update(roomInvitations)
        .set({ status: "declined", respondedAt: new Date() })
        .where(eq(roomInvitations.id, inviteId));

      await createNotification({
        recipientId: invitation.inviterId,
        actorId: userId,
        type: "invitation_declined",
        title: "Invitation Declined",
        message: `${session.user.displayName} declined your invitation`,
        relatedEntityType: "room",
        relatedEntityId: roomId,
      });

      return NextResponse.json({ status: "declined" });
    }

    // Accept: guard against concurrent/duplicate submissions
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

    await db
      .update(roomInvitations)
      .set({ status: "accepted", respondedAt: new Date() })
      .where(eq(roomInvitations.id, inviteId));

    const [room] = await db
      .select({ name: rooms.name, slug: rooms.slug })
      .from(rooms)
      .where(eq(rooms.id, roomId))
      .limit(1);

    await createNotification({
      recipientId: invitation.inviterId,
      actorId: userId,
      type: "invitation_accepted",
      title: "Invitation Accepted",
      message: `${session.user.displayName} joined "${room?.name ?? "the room"}"`,
      relatedEntityType: "room",
      relatedEntityId: roomId,
      actionUrl: `/rooms/${room?.slug}`,
    });

    return NextResponse.json({ status: "accepted", roomSlug: room?.slug });
  } catch (err) {
    console.error("Respond to invitation error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
