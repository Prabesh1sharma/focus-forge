import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import SettingsPageClient from "./SettingsPageClient";

export const instant = false;

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [user] = await db
    .select({
      username: users.username,
      displayName: users.displayName,
      email: users.email,
      bio: users.bio,
      timezone: users.timezone,
      dailyGoalMinutes: users.dailyGoalMinutes,
      profileVisibility: users.profileVisibility,
      primaryGoal: users.primaryGoal,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user) redirect("/login");

  return <SettingsPageClient user={user} />;
}
