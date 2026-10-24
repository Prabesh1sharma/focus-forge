import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  extensionTokens,
  distractionSettings,
  blockedDomains,
  focusSessions,
  users,
} from "@/lib/db/schema";
import { eq, and, isNull, gt, sql } from "drizzle-orm";
import { hashSha256 } from "@/lib/extension/crypto";
import { calculateRemaining } from "@/lib/timer/engine";

// GET /api/extension/sync
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing or malformed Authorization header.", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const rawToken = authHeader.slice(7).trim();
  if (!rawToken) {
    return NextResponse.json(
      { error: "Token is required.", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const tokenHash = hashSha256(rawToken);
  const now = new Date();

  // Validate token in database
  const [tokenRecord] = await db
    .select()
    .from(extensionTokens)
    .where(
      and(
        eq(extensionTokens.tokenHash, tokenHash),
        isNull(extensionTokens.revokedAt),
        gt(extensionTokens.expiresAt, now)
      )
    )
    .limit(1);

  if (!tokenRecord) {
    return NextResponse.json(
      {
        error: "Invalid, expired, or revoked extension credentials.",
        code: "UNAUTHORIZED",
      },
      { status: 401 }
    );
  }

  // Update token's lastUsedAt (fire-and-forget or awaited)
  await db
    .update(extensionTokens)
    .set({ lastUsedAt: now })
    .where(eq(extensionTokens.id, tokenRecord.id));

  const userId = tokenRecord.userId;

  // Fetch user info
  const [user] = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      username: users.username,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  // Fetch or initialize distraction settings
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

  // Fetch all enabled blocked domains for this user
  const domainRows = await db
    .select({
      id: blockedDomains.id,
      domain: blockedDomains.domain,
      category: blockedDomains.category,
      isEnabled: blockedDomains.isEnabled,
    })
    .from(blockedDomains)
    .where(
      and(
        eq(blockedDomains.userId, userId),
        eq(blockedDomains.isEnabled, true)
      )
    );

  const enabledDomains = domainRows.map((d) => d.domain);

  // Fetch active or paused focus session
  const [activeSessionRow] = await db
    .select()
    .from(focusSessions)
    .where(
      and(
        eq(focusSessions.userId, userId),
        sql`${focusSessions.status} IN ('active', 'paused')`
      )
    )
    .limit(1);

  let activeSessionPayload: {
    id: string;
    sessionType: "focus" | "short_break" | "long_break";
    status: "active" | "paused";
    label: string | null;
    remainingSeconds: number;
    plannedDurationSeconds: number;
    expectedEndAt: string;
    startedAt: string;
  } | null = null;

  let isSessionValidAndOngoing = false;

  if (activeSessionRow) {
    const calc = calculateRemaining({
      sessionId: activeSessionRow.id,
      sessionType: activeSessionRow.sessionType,
      status: activeSessionRow.status,
      startedAt: activeSessionRow.startedAt,
      expectedEndAt: activeSessionRow.expectedEndAt,
      pausedDurationSeconds: activeSessionRow.pausedDurationSeconds,
      lastPausedAt: activeSessionRow.lastPausedAt,
      plannedDurationSeconds: activeSessionRow.plannedDurationSeconds,
    });

    if (!calc.isExpired) {
      isSessionValidAndOngoing = true;
      activeSessionPayload = {
        id: activeSessionRow.id,
        sessionType: activeSessionRow.sessionType,
        status: activeSessionRow.status as "active" | "paused",
        label: activeSessionRow.label,
        remainingSeconds: calc.remainingSeconds,
        plannedDurationSeconds: activeSessionRow.plannedDurationSeconds,
        expectedEndAt: activeSessionRow.expectedEndAt.toISOString(),
        startedAt: activeSessionRow.startedAt.toISOString(),
      };
    }
  }

  // Determine whether blocking rules should be active
  let isBlockingActive = false;

  if (settings.isEnabled && enabledDomains.length > 0) {
    if (settings.scheduleMode === "always") {
      isBlockingActive = true;
    } else if (isSessionValidAndOngoing && activeSessionPayload) {
      const isEligibleSession =
        settings.scheduleMode === "focus_and_breaks" ||
        activeSessionPayload.sessionType === "focus";

      if (isEligibleSession) {
        if (activeSessionPayload.status === "active") {
          isBlockingActive = true;
        } else if (activeSessionPayload.status === "paused") {
          isBlockingActive = settings.pausePolicy === "keep_blocking";
        }
      }
    }
  }

  return NextResponse.json({
    isBlockingActive,
    distractionSettings: {
      isEnabled: settings.isEnabled,
      scheduleMode: settings.scheduleMode,
      pausePolicy: settings.pausePolicy,
    },
    blockedDomains: enabledDomains,
    activeSession: activeSessionPayload,
    user: user || { id: userId, displayName: "FocusForge User", username: "user" },
    serverTime: now.toISOString(),
  });
}
