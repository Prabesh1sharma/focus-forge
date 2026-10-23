import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { rooms, roomMemberships, roomJoinRequests } from "@/lib/db/schema";
import { createRoomSchema } from "@/lib/validations/rooms";
import { generateSlug } from "@/lib/utils";
import { eq, and, sql } from "drizzle-orm";

// POST /api/rooms — create a room
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = createRoomSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
    }

    const { name, description, avatarColor, visibility } = parsed.data;
    const userId = session.user.id;

    // Generate unique slug
    let slug = generateSlug(name);
    let attempt = 0;
    while (true) {
      const candidate = attempt === 0 ? slug : `${slug}-${attempt}`;
      const [existing] = await db
        .select({ id: rooms.id })
        .from(rooms)
        .where(eq(rooms.slug, candidate))
        .limit(1);
      if (!existing) {
        slug = candidate;
        break;
      }
      attempt++;
      if (attempt > 10) {
        slug = `${slug}-${Date.now()}`;
        break;
      }
    }

    // Create room + membership in a transaction
    const [newRoom] = await db
      .insert(rooms)
      .values({
        name,
        slug,
        description: description || null,
        avatarColor: avatarColor || "#10b981",
        visibility,
        createdBy: userId,
      })
      .returning();

    await db.insert(roomMemberships).values({
      roomId: newRoom.id,
      userId,
      role: "owner",
    });

    return NextResponse.json({ room: newRoom }, { status: 201 });
  } catch (err) {
    console.error("Create room error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET /api/rooms — list public rooms
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // First get all public rooms
  const roomList = await db
    .select()
    .from(rooms)
    .where(eq(rooms.visibility, "public"))
    .orderBy(rooms.createdAt)
    .limit(50);

  // Get member counts for all rooms
  const memberCounts = await db
    .select({
      roomId: roomMemberships.roomId,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(roomMemberships)
    .groupBy(roomMemberships.roomId);

  // Get memberships for current user
  const userMemberships = await db
    .select({ roomId: roomMemberships.roomId })
    .from(roomMemberships)
    .where(eq(roomMemberships.userId, userId));

  // Get pending join requests for current user
  const userJoinRequests = await db
    .select({ roomId: roomJoinRequests.roomId })
    .from(roomJoinRequests)
    .where(
      and(
        eq(roomJoinRequests.userId, userId),
        eq(roomJoinRequests.status, "pending")
      )
    );

  // Build lookup maps
  const countMap = new Map(memberCounts.map(m => [m.roomId, m.count]));
  const memberSet = new Set(userMemberships.map(m => m.roomId));
  const requestSet = new Set(userJoinRequests.map(r => r.roomId));

  const publicRooms = roomList.map(room => ({
    id: room.id,
    name: room.name,
    slug: room.slug,
    description: room.description,
    avatarColor: room.avatarColor,
    visibility: room.visibility,
    createdBy: room.createdBy,
    createdAt: room.createdAt,
    memberCount: countMap.get(room.id) ?? 0,
    isMember: memberSet.has(room.id),
    hasRequested: requestSet.has(room.id),
  }));

  return NextResponse.json({ rooms: publicRooms });
}
