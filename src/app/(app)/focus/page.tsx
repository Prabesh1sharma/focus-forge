import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import FocusPageClient from "./FocusPageClient";

export const metadata = { title: "Focus Timer" };

export default async function FocusPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [user] = await db
    .select({
      id: users.id,
      focusDurationMinutes: users.focusDurationMinutes,
      shortBreakMinutes: users.shortBreakMinutes,
      longBreakMinutes: users.longBreakMinutes,
      sessionsBeforeLongBreak: users.sessionsBeforeLongBreak,
      autoTransition: users.autoTransition,
      soundEnabled: users.soundEnabled,
      soundVolume: users.soundVolume,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user) redirect("/login");

  return (
    <FocusPageClient initialSettings={user} />
  );
}
