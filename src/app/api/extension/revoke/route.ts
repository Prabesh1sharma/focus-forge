import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { extensionTokens } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { hashSha256 } from "@/lib/extension/crypto";

// POST /api/extension/revoke — Revoke caller extension token
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawToken = authHeader.slice(7).trim();
  const tokenHash = hashSha256(rawToken);

  const [revoked] = await db
    .update(extensionTokens)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(extensionTokens.tokenHash, tokenHash),
        isNull(extensionTokens.revokedAt)
      )
    )
    .returning();

  if (!revoked) {
    return NextResponse.json(
      { error: "Token not found or already revoked." },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, message: "Disconnected successfully." });
}
