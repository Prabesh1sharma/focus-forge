import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { rooms, roomMemberships, users, focusSessions } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Users, Trophy, Activity, Timer } from "lucide-react";
import { formatDuration, formatDate, getInitials } from "@/lib/utils";
import RoomLeaderboard from "./RoomLeaderboard";
import InviteUserModal from "./InviteUserModal";

export const instant = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: `Room: ${slug}` };
}

export default async function RoomPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");

  const { slug } = await params;

  const [room] = await db
    .select()
    .from(rooms)
    .where(eq(rooms.slug, slug))
    .limit(1);

  if (!room) notFound();

  // Check membership
  const [membership] = await db
    .select()
    .from(roomMemberships)
    .where(
      and(
        eq(roomMemberships.roomId, room.id),
        eq(roomMemberships.userId, session.user.id)
      )
    )
    .limit(1);

  if (!membership && room.visibility === "private") {
    redirect("/dashboard");
  }

  const isOwnerOrAdmin = membership?.role === "owner" || membership?.role === "admin";

  // Get members with their stats
  const members = await db
    .select({
      userId: roomMemberships.userId,
      role: roomMemberships.role,
      joinedAt: roomMemberships.joinedAt,
      username: users.username,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
    })
    .from(roomMemberships)
    .innerJoin(users, eq(users.id, roomMemberships.userId))
    .where(eq(roomMemberships.roomId, room.id))
    .orderBy(roomMemberships.joinedAt);

  // Recent room sessions
  const recentSessions = await db
    .select({
      id: focusSessions.id,
      userId: focusSessions.userId,
      label: focusSessions.label,
      startedAt: focusSessions.startedAt,
      actualFocusSeconds: focusSessions.actualFocusSeconds,
      username: users.username,
      displayName: users.displayName,
    })
    .from(focusSessions)
    .innerJoin(users, eq(users.id, focusSessions.userId))
    .where(
      and(
        eq(focusSessions.roomId, room.id),
        eq(focusSessions.status, "completed"),
        eq(focusSessions.sessionType, "focus")
      )
    )
    .orderBy(desc(focusSessions.startedAt))
    .limit(15);

  // Room total focus time
  const [roomStats] = await db
    .select({
      totalSeconds: sql<number>`COALESCE(SUM(${focusSessions.actualFocusSeconds}), 0)`,
      sessionCount: sql<number>`COUNT(*)`,
    })
    .from(focusSessions)
    .where(
      and(
        eq(focusSessions.roomId, room.id),
        eq(focusSessions.status, "completed"),
        eq(focusSessions.sessionType, "focus")
      )
    );

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      {/* Room header */}
      <div className="card" style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 24, padding: 24 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14, background: room.avatarColor,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22, fontWeight: 800, color: "#fff", flexShrink: 0,
        }}>
          {room.name.charAt(0).toUpperCase()}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
              {room.name}
            </h1>
            <span style={{ fontSize: 11, background: "var(--surface-3)", color: "var(--text-muted)", padding: "2px 8px", borderRadius: 4 }}>
              {room.visibility}
            </span>
          </div>
          {room.description && (
            <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.5 }}>{room.description}</p>
          )}
          <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
              <Users size={12} /> {members.length} member{members.length !== 1 ? "s" : ""}
            </span>
            <span style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
              <Timer size={12} /> {formatDuration(Number(roomStats?.totalSeconds ?? 0))} total focus
            </span>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Created {formatDate(room.createdAt, "MMM yyyy")}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {membership && <Link href="/focus" className="btn-primary" style={{ fontSize: 13, padding: "8px 14px" }}>
            <Timer size={14} /> Start Session
          </Link>}
          {isOwnerOrAdmin && <InviteUserModal roomId={room.id} />}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20, alignItems: "start" }}>
        {/* Left: Activity + Members */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Recent Activity */}
          <div className="card">
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
              <Activity size={15} /> Recent Activity
            </h2>
            {recentSessions.length === 0 ? (
              <div className="empty-state" style={{ padding: 32 }}>
                <Timer size={28} color="var(--text-muted)" />
                <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No sessions yet. Be the first to focus!</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {recentSessions.map((s) => (
                  <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--brand-800)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff" }}>
                        {getInitials(s.displayName)}
                      </div>
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{s.displayName}</span>
                        {s.label && <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 6 }}>· {s.label}</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--brand-400)" }}>{formatDuration(s.actualFocusSeconds)}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{formatDate(s.startedAt, "MMM d")}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Members */}
          <div className="card">
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
              <Users size={15} /> Members
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {members.map((m) => (
                <div key={m.userId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--brand-800)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                    {getInitials(m.displayName)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{m.displayName}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>@{m.username}</div>
                  </div>
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: m.role === "owner" ? "rgba(5,150,105,0.15)" : "var(--surface-3)", color: m.role === "owner" ? "var(--brand-400)" : "var(--text-muted)" }}>
                    {m.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Leaderboard */}
        <div className="card">
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
            <Trophy size={15} /> Leaderboard
          </h2>
          <RoomLeaderboard roomId={room.id} />
        </div>
      </div>
    </div>
  );
}
