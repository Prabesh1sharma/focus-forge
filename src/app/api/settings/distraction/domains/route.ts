import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { blockedDomains } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { normalizeDomain } from "@/lib/validations/domains";

// POST /api/settings/distraction/domains — Add a domain to blocklist
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const body = await req.json().catch(() => ({}));
  const rawDomain = body.domain;
  const category = (body.category || "custom").slice(0, 50);

  const normalized = normalizeDomain(rawDomain);
  if (!normalized.success || !normalized.domain) {
    return NextResponse.json({ error: normalized.error }, { status: 400 });
  }

  const domain = normalized.domain;

  // Check if domain already exists for this user
  const [existing] = await db
    .select()
    .from(blockedDomains)
    .where(
      and(
        eq(blockedDomains.userId, userId),
        eq(blockedDomains.domain, domain)
      )
    )
    .limit(1);

  if (existing) {
    // If it exists but was disabled, re-enable it
    if (!existing.isEnabled) {
      const [reactivated] = await db
        .update(blockedDomains)
        .set({ isEnabled: true, updatedAt: new Date() })
        .where(eq(blockedDomains.id, existing.id))
        .returning();
      return NextResponse.json({ domain: reactivated });
    }
    return NextResponse.json(
      { error: `'${domain}' is already in your blocklist.` },
      { status: 409 }
    );
  }

  const [inserted] = await db
    .insert(blockedDomains)
    .values({
      userId,
      domain,
      category,
      isEnabled: true,
    })
    .returning();

  return NextResponse.json({ domain: inserted }, { status: 201 });
}
