import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { extensionPairingCodes } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { generatePairingCode, hashSha256 } from "@/lib/extension/crypto";

// POST /api/extension/pairing-code
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const rawCode = generatePairingCode();
  const codeHash = hashSha256(rawCode);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes

  try {
    // Invalidate previous unredeemed codes for this user
    await db
      .delete(extensionPairingCodes)
      .where(
        and(
          eq(extensionPairingCodes.userId, userId),
          isNull(extensionPairingCodes.usedAt)
        )
      );

    await db.insert(extensionPairingCodes).values({
      userId,
      codeHash,
      expiresAt,
    });

    return NextResponse.json({
      code: rawCode,
      expiresAt: expiresAt.toISOString(),
      expiresInSeconds: 300,
    });
  } catch (error) {
    console.error("Failed to generate pairing code:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
