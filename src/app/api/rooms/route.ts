import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { rooms, roomMemberships } from "@/lib/db/schema";
import { createRoomSchema } from "@/lib/validations/rooms";
import { generateSlug } from "@/lib/utils";
import { eq } from "drizzle-orm";

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

  const publicRooms = await db
    .select()
    .from(rooms)
    .where(eq(rooms.visibility, "public"))
    .orderBy(rooms.createdAt)
    .limit(50);

  return NextResponse.json({ rooms: publicRooms });
}
