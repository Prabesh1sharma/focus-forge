import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import Link from "next/link";

export default async function LandingPage() {
  const session = await auth();
  if (session) redirect("/dashboard");

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--surface-0)" }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="8" fill="#059669" />
            <path d="M8 14L12 18L20 10" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ fontWeight: 700, fontSize: 18, color: "var(--text-primary)" }}>FocusForge</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="btn-ghost" style={{ fontSize: 14 }}>Sign in</Link>
          <Link href="/register" className="btn-primary" style={{ fontSize: 14, padding: "8px 18px" }}>Get started</Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center" style={{ paddingTop: 80, paddingBottom: 80 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--surface-2)", border: "1px solid var(--border-strong)", borderRadius: 99, padding: "6px 16px", marginBottom: 28, fontSize: 13, color: "var(--brand-400)" }}>
          <span>🔥</span>
          <span>Social focus & reading tracker</span>
        </div>

        <h1 style={{ fontSize: "clamp(36px, 5vw, 64px)", fontWeight: 800, lineHeight: 1.1, color: "var(--text-primary)", maxWidth: 720, marginBottom: 24 }}>
          Forge your focus.{" "}
          <span style={{ background: "linear-gradient(135deg, #10b981, #059669)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Build your streak.
          </span>
        </h1>

        <p style={{ fontSize: 18, color: "var(--text-muted)", maxWidth: 560, lineHeight: 1.7, marginBottom: 40 }}>
          Develop consistent reading and deep-work habits through Pomodoro sessions,
          accountability rooms, leaderboards, streaks, and activity heatmaps.
        </p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          <Link href="/register" className="btn-primary" style={{ padding: "14px 28px", fontSize: 16 }}>
            Start for free
          </Link>
          <Link href="/login" className="btn-secondary" style={{ padding: "14px 28px", fontSize: 16 }}>
            Sign in
          </Link>
        </div>

        {/* Feature pills */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginTop: 60 }}>
          {[
            { icon: "⏱", label: "Pomodoro Timer" },
            { icon: "🏆", label: "Room Leaderboards" },
            { icon: "🔥", label: "Streak Tracking" },
            { icon: "📊", label: "Activity Heatmap" },
            { icon: "👥", label: "Accountability Rooms" },
            { icon: "🔔", label: "Smart Notifications" },
          ].map((f) => (
            <div
              key={f.label}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                background: "var(--surface-1)", border: "1px solid var(--border)",
                borderRadius: 10, padding: "10px 16px", fontSize: 14, color: "var(--text-secondary)"
              }}
            >
              <span>{f.icon}</span>
              <span>{f.label}</span>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer style={{ textAlign: "center", padding: "24px", borderTop: "1px solid var(--border)", color: "var(--text-muted)", fontSize: 13 }}>
        © 2024 FocusForge. Built for focused minds.
      </footer>
    </div>
  );
}
