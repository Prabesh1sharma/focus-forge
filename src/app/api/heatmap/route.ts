import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getHeatmapData } from "@/lib/stats/calculations";

// GET /api/heatmap — get heatmap data for the current user
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [user] = await db
    .select({ timezone: users.timezone })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const timezone = user?.timezone ?? "UTC";
  const data = await getHeatmapData(session.user.id, timezone);

  return NextResponse.json({ heatmap: data });
}
