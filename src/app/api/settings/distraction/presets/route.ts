import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { blockedDomains } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { PRESET_CATEGORIES } from "@/lib/validations/domains";

// POST /api/settings/distraction/presets — Bulk apply or toggle preset category
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const body = await req.json().catch(() => ({}));
  const categoryKey = body.category as string;
  const action = body.action as "add" | "remove";

  const preset = PRESET_CATEGORIES[categoryKey];
  if (!preset) {
    return NextResponse.json(
      { error: `Unknown preset category: ${categoryKey}` },
      { status: 400 }
    );
  }

  if (action === "remove") {
    // Delete domains associated with this preset category
    await db
      .delete(blockedDomains)
      .where(
        and(
          eq(blockedDomains.userId, userId),
          inArray(blockedDomains.domain, preset.domains)
        )
      );
  } else {
    // Action: 'add'
    // Fetch existing domains for user
    const existing = await db
      .select({ domain: blockedDomains.domain, id: blockedDomains.id })
      .from(blockedDomains)
      .where(
        and(
          eq(blockedDomains.userId, userId),
          inArray(blockedDomains.domain, preset.domains)
        )
      );

    const existingSet = new Set(existing.map((e) => e.domain));
    const toInsert = preset.domains
      .filter((d) => !existingSet.has(d))
      .map((d) => ({
        userId,
        domain: d,
        category: categoryKey,
        isEnabled: true,
      }));

    if (toInsert.length > 0) {
      await db.insert(blockedDomains).values(toInsert);
    }

    // If any existed but were disabled, re-enable them
    if (existing.length > 0) {
      await db
        .update(blockedDomains)
        .set({ isEnabled: true, updatedAt: new Date() })
        .where(
          and(
            eq(blockedDomains.userId, userId),
            inArray(blockedDomains.domain, preset.domains)
          )
        );
    }
  }

  // Return updated full list
  const updatedDomains = await db
    .select()
    .from(blockedDomains)
    .where(eq(blockedDomains.userId, userId))
    .orderBy(blockedDomains.createdAt);

  return NextResponse.json({ success: true, domains: updatedDomains });
}
