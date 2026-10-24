import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { users, focusSessions } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getUserStats, getHeatmapData } from "@/lib/stats/calculations";
import { formatDuration, formatDate } from "@/lib/utils";
import HeatmapCalendar from "@/components/stats/HeatmapCalendar";
import RecentSessionsList from "@/components/stats/RecentSessionsList";
import { Timer, Flame, Target, TrendingUp, Calendar, Award } from "lucide-react";

export const metadata = { title: "Statistics" };

export default async function StatsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user) redirect("/login");

  const [stats, heatmapData, rawRecentSessions] = await Promise.all([
    getUserStats(user.id, user.timezone, user.dailyGoalMinutes),
    getHeatmapData(user.id, user.timezone),
    db
      .select({
        id: focusSessions.id,
        label: focusSessions.label,
        startedAt: focusSessions.startedAt,
        actualFocusSeconds: focusSessions.actualFocusSeconds,
      })
      .from(focusSessions)
      .where(
        and(
          eq(focusSessions.userId, user.id),
          eq(focusSessions.status, "completed"),
          eq(focusSessions.sessionType, "focus")
        )
      )
      .orderBy(desc(focusSessions.startedAt))
      .limit(6),
  ]);

  const initialHasMore = rawRecentSessions.length > 5;
  const initialSessions = rawRecentSessions.slice(0, 5).map((s) => ({
    id: s.id,
    label: s.label,
    startedAt: s.startedAt.toISOString(),
    actualFocusSeconds: s.actualFocusSeconds,
  }));

  const goalProgress = Math.min(
    100,
    Math.round((stats.todayFocusSeconds / (user.dailyGoalMinutes * 60)) * 100)
  );

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>
          Statistics
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Your focus journey at a glance</p>
      </div>

      {/* Primary stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 28 }}>
        <StatCard icon={<Timer size={16} />} label="Today" value={formatDuration(stats.todayFocusSeconds)} color="var(--brand-500)" />
        <StatCard icon={<Calendar size={16} />} label="This Week" value={formatDuration(stats.weekFocusSeconds)} color="#3b82f6" />
        <StatCard icon={<TrendingUp size={16} />} label="This Month" value={formatDuration(stats.monthFocusSeconds)} color="#8b5cf6" />
        <StatCard icon={<Award size={16} />} label="All Time" value={formatDuration(stats.lifetimeFocusSeconds)} color="#f59e0b" />
        <StatCard icon={<Flame size={16} />} label="Current Streak" value={`${stats.currentStreak}d`} color="#ef4444" />
        <StatCard icon={<Flame size={16} />} label="Longest Streak" value={`${stats.longestStreak}d`} color="#f97316" />
        <StatCard icon={<Target size={16} />} label="Daily Goal" value={`${goalProgress}%`} color="#10b981" />
        <StatCard icon={<Timer size={16} />} label="Longest Session" value={formatDuration(stats.longestSessionSeconds)} color="#6366f1" />
      </div>

      {/* Heatmap */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>Activity Heatmap</h2>
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Past 365 days</span>
        </div>
        <HeatmapCalendar data={heatmapData} />
      </div>

      {/* Daily summary */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 16 }}>Summary</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <SummaryRow label="Completed sessions" value={String(stats.completedSessions)} />
            <SummaryRow label="Daily average" value={formatDuration(stats.dailyAverageSeconds)} />
            <SummaryRow label="Daily goal" value={`${user.dailyGoalMinutes} min`} />
            <SummaryRow label="Primary goal" value={user.primaryGoal?.replace("_", " ") ?? "—"} />
          </div>
        </div>
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 16 }}>Today&apos;s Progress</h3>
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Focus time</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                {formatDuration(stats.todayFocusSeconds)}
              </span>
            </div>
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${goalProgress}%` }} />
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
              {goalProgress}% of {user.dailyGoalMinutes}min goal
            </div>
          </div>
          {stats.currentStreak > 0 && (
            <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.08)", borderRadius: 8, border: "1px solid rgba(239,68,68,0.2)" }}>
              <span className="streak-text" style={{ fontSize: 14, fontWeight: 700 }}>
                🔥 {stats.currentStreak}-day streak
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Recent sessions */}
      <div className="card">
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>
          Recent Sessions
        </h2>
        <RecentSessionsList
          initialSessions={initialSessions}
          initialHasMore={initialHasMore}
          limit={5}
        />
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="card" style={{ borderLeft: `3px solid ${color}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)" }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", textTransform: "capitalize" }}>{value}</span>
    </div>
  );
}
