import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { rooms, roomMemberships, roomInvitations, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { inviteUserSchema } from "@/lib/validations/rooms";
import { createNotification } from "@/lib/notifications";

// POST /api/rooms/[id]/invite
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: roomId } = await params;
  const inviterId = session.user.id;

  try {
    // Verify inviter is owner/admin
    const [inviterMembership] = await db
      .select()
      .from(roomMemberships)
      .where(
        and(
          eq(roomMemberships.roomId, roomId),
          eq(roomMemberships.userId, inviterId)
        )
      )
      .limit(1);

    if (!inviterMembership || !["owner", "admin"].includes(inviterMembership.role)) {
      return NextResponse.json({ error: "Only room owners and admins can invite users" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = inviteUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
    }

    // Find invitee by username
    const [invitee] = await db
      .select({ id: users.id, username: users.username, displayName: users.displayName })
      .from(users)
      .where(eq(users.username, parsed.data.username.toLowerCase()))
      .limit(1);

    if (!invitee) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (invitee.id === inviterId) {
      return NextResponse.json({ error: "Cannot invite yourself" }, { status: 400 });
    }

    // Check if already a member
    const [existingMembership] = await db
      .select()
      .from(roomMemberships)
      .where(
        and(
          eq(roomMemberships.roomId, roomId),
          eq(roomMemberships.userId, invitee.id)
        )
      )
      .limit(1);

    if (existingMembership) {
      return NextResponse.json({ error: "User is already a member of this room" }, { status: 409 });
    }

    // Check for pending invitation
    const [existingInvite] = await db
      .select()
      .from(roomInvitations)
      .where(
        and(
          eq(roomInvitations.roomId, roomId),
          eq(roomInvitations.inviteeId, invitee.id),
          eq(roomInvitations.status, "pending")
        )
      )
      .limit(1);

    if (existingInvite) {
      return NextResponse.json({ error: "A pending invitation already exists for this user" }, { status: 409 });
    }

    // Get room info
    const [room] = await db
      .select({ name: rooms.name })
      .from(rooms)
      .where(eq(rooms.id, roomId))
      .limit(1);

    // Create invitation
    const [invitation] = await db
      .insert(roomInvitations)
      .values({
        roomId,
        inviterId,
        inviteeId: invitee.id,
        status: "pending",
      })
      .returning();

    // Create notification for invitee
    const [inviterUser] = await db
      .select({ displayName: users.displayName, username: users.username })
      .from(users)
      .where(eq(users.id, inviterId))
      .limit(1);

    await createNotification({
      recipientId: invitee.id,
      actorId: inviterId,
      type: "room_invitation",
      title: "Room Invitation",
      message: `${inviterUser?.displayName ?? "Someone"} invited you to join "${room?.name ?? "a room"}"`,
      relatedEntityType: "room_invitation",
      relatedEntityId: invitation.id,
      actionUrl: "/notifications",
    });

    return NextResponse.json({ invitation }, { status: 201 });
  } catch (err) {
    console.error("Invite error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
