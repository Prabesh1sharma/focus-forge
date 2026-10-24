import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { extensionPairingCodes, extensionTokens, users } from "@/lib/db/schema";
import { eq, and, isNull, gt } from "drizzle-orm";
import { generateExtensionToken, hashSha256 } from "@/lib/extension/crypto";

// Simple in-memory sliding-window rate limit for pairing attempts
const pairingAttempts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = pairingAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    pairingAttempts.set(ip, { count: 1, resetAt: now + 60 * 1000 }); // 1 min window
    return true;
  }
  if (entry.count >= 10) {
    return false; // Max 10 attempts per minute
  }
  entry.count++;
  return true;
}

// POST /api/extension/pair
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many pairing attempts. Please wait a moment." },
      { status: 429 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const rawCode = body.code;
    const clientName = (body.clientName || "Chrome Extension").slice(0, 50);

    if (!rawCode || typeof rawCode !== "string") {
      return NextResponse.json(
        { error: "Pairing code is required." },
        { status: 400 }
      );
    }

    const normalizedCode = rawCode.trim().toUpperCase();
    const codeHash = hashSha256(normalizedCode);
    const now = new Date();

    // Query active, non-expired, unredeemed code
    const [codeRecord] = await db
      .select()
      .from(extensionPairingCodes)
      .where(
        and(
          eq(extensionPairingCodes.codeHash, codeHash),
          isNull(extensionPairingCodes.usedAt),
          gt(extensionPairingCodes.expiresAt, now)
        )
      )
      .limit(1);

    if (!codeRecord) {
      return NextResponse.json(
        { error: "Invalid or expired pairing code. Please generate a new one in FocusForge Settings." },
        { status: 400 }
      );
    }

    // Atomic mark as used
    const [claimed] = await db
      .update(extensionPairingCodes)
      .set({ usedAt: now })
      .where(
        and(
          eq(extensionPairingCodes.id, codeRecord.id),
          isNull(extensionPairingCodes.usedAt)
        )
      )
      .returning();

    if (!claimed) {
      return NextResponse.json(
        { error: "This pairing code has already been redeemed." },
        { status: 400 }
      );
    }

    // Generate revocable token
    const rawToken = generateExtensionToken();
    const tokenHash = hashSha256(rawToken);
    const tokenExpiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days

    await db.insert(extensionTokens).values({
      userId: codeRecord.userId,
      tokenHash,
      name: clientName,
      expiresAt: tokenExpiresAt,
      lastUsedAt: now,
    });

    const [user] = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        username: users.username,
      })
      .from(users)
      .where(eq(users.id, codeRecord.userId))
      .limit(1);

    return NextResponse.json({
      token: rawToken,
      user: user || { id: codeRecord.userId },
      expiresAt: tokenExpiresAt.toISOString(),
    });
  } catch (error) {
    console.error("Pairing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
