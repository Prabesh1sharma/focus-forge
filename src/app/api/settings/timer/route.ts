import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { timerSettingsSchema } from "@/lib/validations/auth";

// PATCH /api/settings/timer
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = timerSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
    }

    const [updated] = await db
      .update(users)
      .set({
        ...parsed.data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, session.user.id))
      .returning({
        focusDurationMinutes: users.focusDurationMinutes,
        shortBreakMinutes: users.shortBreakMinutes,
        longBreakMinutes: users.longBreakMinutes,
        sessionsBeforeLongBreak: users.sessionsBeforeLongBreak,
        autoTransition: users.autoTransition,
        soundEnabled: users.soundEnabled,
        soundVolume: users.soundVolume,
      });

    return NextResponse.json({ settings: updated });
  } catch (err) {
    console.error("Settings update error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
