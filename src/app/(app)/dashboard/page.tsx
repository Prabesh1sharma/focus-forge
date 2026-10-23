import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { users, roomMemberships, rooms, focusSessions, notifications } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { getUserStats } from "@/lib/stats/calculations";
import { getLocalDateString, formatDuration } from "@/lib/utils";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Timer,
  Plus,
  Users,
  TrendingUp,
  Flame,
  CheckCircle,
  Bell,
  ChevronRight,
  Target,
} from "lucide-react";

export const metadata = { title: "Dashboard" };

async function getDashboardData(userId: string, timezone: string, dailyGoalMinutes: number) {
  // Get user's rooms
  const memberships = await db
    .select({
      room: rooms,
      role: roomMemberships.role,
    })
    .from(roomMemberships)
    .innerJoin(rooms, eq(roomMemberships.roomId, rooms.id))
    .where(eq(roomMemberships.userId, userId))
    .orderBy(desc(roomMemberships.joinedAt))
    .limit(10);

  // Get pending invitations count
  const [{ count: inviteCount }] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(notifications)
    .where(
      and(
        eq(notifications.recipientId, userId),
        eq(notifications.type, "room_invitation"),
        sql`${notifications.readAt} IS NULL`
      )
    );

  // Get active session
  const [activeSession] = await db
    .select()
    .from(focusSessions)
    .where(
      and(
        eq(focusSessions.userId, userId),
        sql`${focusSessions.status} IN ('active', 'paused')`
      )
    )
    .limit(1);

  // Get today's completed sessions
  const today = getLocalDateString(timezone);
  const [todayStats] = await db
    .select({
      totalSeconds: sql<number>`COALESCE(SUM(actual_focus_seconds), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(focusSessions)
    .where(
      and(
        eq(focusSessions.userId, userId),
        eq(focusSessions.status, "completed"),
        eq(focusSessions.sessionType, "focus"),
        sql`DATE(started_at AT TIME ZONE 'UTC') = ${today}`
      )
    );

  const stats = await getUserStats(userId, timezone, dailyGoalMinutes);

  return {
    memberships,
    inviteCount: Number(inviteCount),
    activeSession,
    todaySeconds: Number(todayStats?.totalSeconds ?? 0),
    todaySessionCount: Number(todayStats?.count ?? 0),
    stats,
  };
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [dbUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!dbUser) redirect("/login");
  if (!dbUser.onboardingCompleted) redirect("/onboarding");

  const data = await getDashboardData(dbUser.id, dbUser.timezone, dbUser.dailyGoalMinutes);
  const goalProgress = Math.min(100, Math.round((data.todaySeconds / (dbUser.dailyGoalMinutes * 60)) * 100));
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>
          {greeting}, {dbUser.displayName.split(" ")[0]} 👋
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
          {data.stats.currentStreak > 0
            ? `🔥 ${data.stats.currentStreak}-day streak — keep it going!`
            : "Start a focus session to begin your streak."}
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 32 }}>
        <StatCard
          icon={<Timer size={18} color="var(--brand-400)" />}
          label="Today's Focus"
          value={formatDuration(data.todaySeconds)}
          sub={`${data.todaySessionCount} session${data.todaySessionCount !== 1 ? "s" : ""}`}
          color="var(--brand-600)"
        />
        <StatCard
          icon={<Flame size={18} color="#f59e0b" />}
          label="Current Streak"
          value={`${data.stats.currentStreak} days`}
          sub={`Best: ${data.stats.longestStreak} days`}
          color="#f59e0b"
        />
        <StatCard
          icon={<Target size={18} color="#8b5cf6" />}
          label="Daily Goal"
          value={`${goalProgress}%`}
          sub={`${formatDuration(data.todaySeconds)} / ${dbUser.dailyGoalMinutes}m`}
          color="#8b5cf6"
        />
        <StatCard
          icon={<CheckCircle size={18} color="#10b981" />}
          label="Total Sessions"
          value={String(data.stats.completedSessions)}
          sub={formatDuration(data.stats.lifetimeFocusSeconds) + " total"}
          color="#10b981"
        />
      </div>

      {/* Goal progress bar */}
      <div className="card" style={{ marginBottom: 24, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)" }}>
            Today&apos;s goal progress
          </span>
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
            {formatDuration(data.todaySeconds)} / {dbUser.dailyGoalMinutes}m
          </span>
        </div>
        <div className="progress-bar">
          <div className="progress-bar-fill" style={{ width: `${goalProgress}%` }} />
        </div>
        <div style={{ marginTop: 12, display: "flex", gap: 12 }}>
          <Link href="/focus" className="btn-primary" style={{ flex: 1, justifyContent: "center" }}>
            <Timer size={16} />
            {data.activeSession ? "Resume Focus Session" : "Start Focus Session"}
          </Link>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, alignItems: "start" }}>
        {/* Rooms list */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>Your Rooms</h2>
            <div style={{ display: "flex", gap: 8 }}>
              <Link href="/rooms" className="btn-secondary" style={{ padding: "7px 14px", fontSize: 13 }}>
                <Users size={14} /> Explore Rooms
              </Link>
              <Link href="/rooms/new" className="btn-primary" style={{ padding: "7px 14px", fontSize: 13 }}>
                <Plus size={14} /> New Room
              </Link>
            </div>
          </div>

          {data.memberships.length === 0 ? (
            <div className="card empty-state">
              <Users size={36} color="var(--text-muted)" />
              <div>
                <p style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>No rooms yet</p>
                <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
                  Create a room and invite friends to stay accountable together.
                </p>
              </div>
              <Link href="/rooms/new" className="btn-primary">
                <Plus size={14} /> Create your first room
              </Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {data.memberships.map(({ room, role }) => (
                <RoomCard key={room.id} room={room} role={role} />
              ))}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Pending invitations */}
          {data.inviteCount > 0 && (
            <div className="card" style={{ background: "rgba(5, 150, 105, 0.08)", borderColor: "var(--brand-800)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <Bell size={16} color="var(--brand-400)" />
                <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>
                  {data.inviteCount} pending invitation{data.inviteCount > 1 ? "s" : ""}
                </span>
              </div>
              <Link href="/notifications" className="btn-primary" style={{ width: "100%", justifyContent: "center", padding: "8px", fontSize: 13 }}>
                View invitations <ChevronRight size={14} />
              </Link>
            </div>
          )}

          {/* Quick stats */}
          <div className="card">
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 14 }}>This Week</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <StatRow label="Focus time" value={formatDuration(data.stats.weekFocusSeconds)} />
              <StatRow label="Daily avg" value={formatDuration(data.stats.dailyAverageSeconds)} />
              <StatRow label="Longest session" value={formatDuration(data.stats.longestSessionSeconds)} />
            </div>
            <div style={{ borderTop: "1px solid var(--border)", marginTop: 14, paddingTop: 14 }}>
              <Link href="/stats" style={{ fontSize: 13, color: "var(--brand-400)", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
                <TrendingUp size={13} /> View full statistics
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="card" style={{ borderLeft: `3px solid ${color}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        {icon}
        <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{sub}</div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{value}</span>
    </div>
  );
}

function RoomCard({ room, role }: { room: { id: string; name: string; slug: string; description: string | null; avatarColor: string; visibility: string }; role: string }) {
  return (
    <Link
      href={`/rooms/${room.slug}`}
      style={{ textDecoration: "none" }}
    >
      <div className="card card-hover" style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px" }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, background: room.avatarColor,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, fontWeight: 700, color: "#fff", flexShrink: 0,
        }}>
          {room.name.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{room.name}</span>
            {room.visibility === "private" && (
              <span style={{ fontSize: 10, background: "var(--surface-3)", color: "var(--text-muted)", padding: "2px 6px", borderRadius: 4 }}>Private</span>
            )}
            {role === "owner" && (
              <span style={{ fontSize: 10, background: "rgba(5,150,105,0.15)", color: "var(--brand-400)", padding: "2px 6px", borderRadius: 4 }}>Owner</span>
            )}
          </div>
          {room.description && (
            <p style={{ fontSize: 12, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>
              {room.description}
            </p>
          )}
        </div>
        <ChevronRight size={16} color="var(--text-muted)" />
      </div>
    </Link>
  );
}
