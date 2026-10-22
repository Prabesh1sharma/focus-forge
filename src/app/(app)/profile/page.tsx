import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getUserStats, getHeatmapData } from "@/lib/stats/calculations";
import { formatDuration, formatDate, getInitials } from "@/lib/utils";
import HeatmapCalendar from "@/components/stats/HeatmapCalendar";
import { Calendar, Flame, Timer, Award, Target } from "lucide-react";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user) redirect("/login");

  const [stats, heatmapData] = await Promise.all([
    getUserStats(user.id, user.timezone, user.dailyGoalMinutes),
    getHeatmapData(user.id, user.timezone),
  ]);

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      {/* Profile header */}
      <div className="card" style={{ display: "flex", gap: 20, marginBottom: 24, padding: 28, alignItems: "flex-start" }}>
        {/* Avatar */}
        <div
          style={{
            width: 80, height: 80, borderRadius: "50%",
            background: "var(--brand-700)", display: "flex",
            alignItems: "center", justifyContent: "center",
            fontSize: 28, fontWeight: 800, color: "#fff",
            flexShrink: 0, border: "3px solid var(--brand-600)",
          }}
        >
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt={user.displayName} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
          ) : (
            getInitials(user.displayName)
          )}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
              {user.displayName}
            </h1>
            {stats.currentStreak > 0 && (
              <span className="streak-text" style={{ fontSize: 14, fontWeight: 700 }}>
                🔥 {stats.currentStreak} day streak
              </span>
            )}
          </div>
          <div style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 6 }}>@{user.username}</div>
          {user.bio && (
            <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.6, maxWidth: 500 }}>
              {user.bio}
            </p>
          )}
          <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
              <Calendar size={12} /> Joined {formatDate(user.createdAt, "MMMM yyyy")}
            </span>
            <span style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
              <Target size={12} /> Goal: {user.dailyGoalMinutes} min/day
            </span>
            {user.primaryGoal && (
              <span style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "capitalize" }}>
                🎯 {user.primaryGoal.replace("_", " ")}
              </span>
            )}
          </div>
        </div>

        <a href="/settings" className="btn-secondary" style={{ fontSize: 13, padding: "8px 16px", textDecoration: "none" }}>
          Edit profile
        </a>
      </div>

      {/* Stats cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 24 }}>
        <MiniStat icon={<Timer size={14} />} label="Total Focus" value={formatDuration(stats.lifetimeFocusSeconds)} />
        <MiniStat icon={<Award size={14} />} label="Sessions" value={String(stats.completedSessions)} />
        <MiniStat icon={<Flame size={14} />} label="Best Streak" value={`${stats.longestStreak}d`} />
        <MiniStat icon={<Timer size={14} />} label="Longest Session" value={formatDuration(stats.longestSessionSeconds)} />
      </div>

      {/* Heatmap */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
            {stats.completedSessions} focus sessions in the last year
          </h2>
        </div>
        <HeatmapCalendar data={heatmapData} />
      </div>
    </div>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="card" style={{ textAlign: "center", padding: "16px 12px" }}>
      <div style={{ color: "var(--brand-400)", display: "flex", justifyContent: "center", marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)" }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 2 }}>{label}</div>
    </div>
  );
}
