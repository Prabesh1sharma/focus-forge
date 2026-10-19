import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { onboardingSchema } from "@/lib/validations/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = onboardingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
  }

  const { primaryGoal, dailyGoalMinutes, timezone } = parsed.data;

  await db
    .update(users)
    .set({
      primaryGoal,
      dailyGoalMinutes,
      timezone,
      onboardingCompleted: true,
      updatedAt: new Date(),
    })
    .where(eq(users.id, session.user.id));

  return NextResponse.json({ success: true });
}
