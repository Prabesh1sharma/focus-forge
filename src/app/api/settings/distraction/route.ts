import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import {
  distractionSettings,
  blockedDomains,
  extensionTokens,
} from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { PRESET_CATEGORIES } from "@/lib/validations/domains";

// GET /api/settings/distraction
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // Retrieve or create settings
  let [settings] = await db
    .select()
    .from(distractionSettings)
    .where(eq(distractionSettings.userId, userId))
    .limit(1);

  if (!settings) {
    const [created] = await db
      .insert(distractionSettings)
      .values({
        userId,
        isEnabled: true,
        scheduleMode: "focus_only",
        pausePolicy: "keep_blocking",
      })
      .returning();
    settings = created;
  }

  // Retrieve user's domains
  const domains = await db
    .select()
    .from(blockedDomains)
    .where(eq(blockedDomains.userId, userId))
    .orderBy(blockedDomains.createdAt);

  // Retrieve active paired devices (non-revoked)
  const devices = await db
    .select({
      id: extensionTokens.id,
      name: extensionTokens.name,
      createdAt: extensionTokens.createdAt,
      lastUsedAt: extensionTokens.lastUsedAt,
    })
    .from(extensionTokens)
    .where(
      and(
        eq(extensionTokens.userId, userId),
        isNull(extensionTokens.revokedAt)
      )
    )
    .orderBy(extensionTokens.createdAt);

  // Calculate preset category coverage
  const existingDomainsSet = new Set(
    domains.filter((d) => d.isEnabled).map((d) => d.domain)
  );

  const presetStatus = Object.entries(PRESET_CATEGORIES).map(([key, cat]) => {
    const total = cat.domains.length;
    const active = cat.domains.filter((d) => existingDomainsSet.has(d)).length;
    return {
      id: key,
      name: cat.name,
      description: cat.description,
      total,
      active,
      isFullyEnabled: active === total,
      isPartiallyEnabled: active > 0 && active < total,
    };
  });

  return NextResponse.json({
    settings,
    domains,
    devices,
    presetStatus,
  });
}

// PATCH /api/settings/distraction
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const body = await req.json().catch(() => ({}));

  const updateData: Partial<typeof distractionSettings.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (typeof body.isEnabled === "boolean") {
    updateData.isEnabled = body.isEnabled;
  }

  if (
    body.scheduleMode === "focus_only" ||
    body.scheduleMode === "focus_and_breaks" ||
    body.scheduleMode === "always"
  ) {
    updateData.scheduleMode = body.scheduleMode;
  }

  if (
    body.pausePolicy === "keep_blocking" ||
    body.pausePolicy === "pause_blocking"
  ) {
    updateData.pausePolicy = body.pausePolicy;
  }

  // Upsert settings
  const [existing] = await db
    .select({ id: distractionSettings.id })
    .from(distractionSettings)
    .where(eq(distractionSettings.userId, userId))
    .limit(1);

  let updated;
  if (existing) {
    [updated] = await db
      .update(distractionSettings)
      .set(updateData)
      .where(eq(distractionSettings.userId, userId))
      .returning();
  } else {
    [updated] = await db
      .insert(distractionSettings)
      .values({
        userId,
        isEnabled: updateData.isEnabled ?? true,
        scheduleMode: updateData.scheduleMode ?? "focus_only",
        pausePolicy: updateData.pausePolicy ?? "keep_blocking",
      })
      .returning();
  }

  return NextResponse.json({ settings: updated });
}
