import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { blockedDomains } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// PATCH /api/settings/distraction/domains/[id] — Toggle domain enabled state
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = session.user.id;
  const body = await req.json().catch(() => ({}));

  if (typeof body.isEnabled !== "boolean") {
    return NextResponse.json(
      { error: "isEnabled boolean is required." },
      { status: 400 }
    );
  }

  const [updated] = await db
    .update(blockedDomains)
    .set({
      isEnabled: body.isEnabled,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(blockedDomains.id, id),
        eq(blockedDomains.userId, userId)
      )
    )
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Domain not found." }, { status: 404 });
  }

  return NextResponse.json({ domain: updated });
}

// DELETE /api/settings/distraction/domains/[id] — Remove domain from blocklist
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = session.user.id;

  const [deleted] = await db
    .delete(blockedDomains)
    .where(
      and(
        eq(blockedDomains.id, id),
        eq(blockedDomains.userId, userId)
      )
    )
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Domain not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true, removedDomain: deleted.domain });
}
