import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { extensionTokens } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// DELETE /api/settings/distraction/devices/[id] — Revoke extension device
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

  const [revoked] = await db
    .update(extensionTokens)
    .set({
      revokedAt: new Date(),
    })
    .where(
      and(
        eq(extensionTokens.id, id),
        eq(extensionTokens.userId, userId)
      )
    )
    .returning();

  if (!revoked) {
    return NextResponse.json(
      { error: "Extension device not found." },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, message: "Extension disconnected." });
}
