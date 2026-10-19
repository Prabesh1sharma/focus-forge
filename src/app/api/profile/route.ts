import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { updateProfileSchema } from "@/lib/validations/auth";

// GET /api/profile — get own profile
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      email: users.email,
      avatarUrl: users.avatarUrl,
      bio: users.bio,
      timezone: users.timezone,
      dailyGoalMinutes: users.dailyGoalMinutes,
      primaryGoal: users.primaryGoal,
      profileVisibility: users.profileVisibility,
      focusDurationMinutes: users.focusDurationMinutes,
      shortBreakMinutes: users.shortBreakMinutes,
      longBreakMinutes: users.longBreakMinutes,
      sessionsBeforeLongBreak: users.sessionsBeforeLongBreak,
      autoTransition: users.autoTransition,
      soundEnabled: users.soundEnabled,
      soundVolume: users.soundVolume,
      onboardingCompleted: users.onboardingCompleted,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user });
}

// PATCH /api/profile — update own profile
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { errors: parsed.error.flatten(), message: "Validation failed" },
        { status: 400 }
      );
    }

    const updates = parsed.data;

    // If username is being changed, check uniqueness
    if (updates.username) {
      const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(
          and(
            eq(users.username, updates.username.toLowerCase()),
            ne(users.id, session.user.id)
          )
        )
        .limit(1);

      if (existing) {
        return NextResponse.json(
          { message: "Username is already taken" },
          { status: 409 }
        );
      }
      updates.username = updates.username.toLowerCase();
    }

    const [updated] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, session.user.id))
      .returning({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      });

    return NextResponse.json({ user: updated });
  } catch (err) {
    console.error("Profile update error:", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
