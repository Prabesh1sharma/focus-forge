"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

interface SettingsPageClientProps {
  user: {
    username: string;
    displayName: string;
    email: string;
    bio: string | null;
    timezone: string;
    dailyGoalMinutes: number;
    profileVisibility: string;
    primaryGoal: string | null;
  };
}

export default function SettingsPageClient({ user }: SettingsPageClientProps) {
  const router = useRouter();
  const [form, setForm] = useState({
    displayName: user.displayName,
    username: user.username,
    bio: user.bio ?? "",
    timezone: user.timezone,
    dailyGoalMinutes: user.dailyGoalMinutes,
    profileVisibility: user.profileVisibility as "public" | "private",
    primaryGoal: user.primaryGoal ?? "deep_work",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to save");
      } else {
        setSaved(true);
        router.refresh();
        setTimeout(() => setSaved(false), 3000);
      }
    } finally {
      setSaving(false);
    }
  }

  const TIMEZONES = Intl.supportedValuesOf("timeZone");

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", marginBottom: 6 }}>Settings</h1>
      <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 28 }}>Manage your profile and preferences</p>

      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Profile section */}
        <div className="card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 18 }}>Profile</h2>

          {saved && (
            <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid var(--brand-700)", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "var(--brand-400)", marginBottom: 16 }}>
              ✓ Settings saved successfully
            </div>
          )}

          {error && (
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#f87171", marginBottom: 16 }}>
              {error}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div className="form-group">
              <label className="label" htmlFor="displayName">Display Name</label>
              <input id="displayName" type="text" className="input" value={form.displayName} onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))} maxLength={50} />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="username">Username</label>
              <input id="username" type="text" className="input" value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value.toLowerCase() }))} maxLength={30} />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: 14 }}>
            <label className="label" htmlFor="bio">Bio</label>
            <textarea id="bio" className="input" value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} maxLength={200} rows={3} style={{ resize: "vertical" }} />
          </div>
        </div>

        {/* Preferences */}
        <div className="card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 18 }}>Preferences</h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="form-group">
              <label className="label" htmlFor="timezone">Timezone</label>
              <select id="timezone" className="input" value={form.timezone} onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}>
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="label" htmlFor="dailyGoal">Daily Focus Goal (minutes)</label>
              <input id="dailyGoal" type="number" className="input" min={5} max={720} value={form.dailyGoalMinutes} onChange={(e) => setForm((f) => ({ ...f, dailyGoalMinutes: Number(e.target.value) }))} />
            </div>

            <div className="form-group">
              <label className="label" htmlFor="primaryGoal">Primary Goal</label>
              <select id="primaryGoal" className="input" value={form.primaryGoal} onChange={(e) => setForm((f) => ({ ...f, primaryGoal: e.target.value }))}>
                <option value="reading">Reading</option>
                <option value="studying">Studying</option>
                <option value="deep_work">Deep Work</option>
              </select>
            </div>

            <div className="form-group">
              <label className="label">Profile Visibility</label>
              <div style={{ display: "flex", gap: 10 }}>
                {(["public", "private"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, profileVisibility: v }))}
                    className={form.profileVisibility === v ? "btn-primary" : "btn-secondary"}
                    style={{ flex: 1, justifyContent: "center", fontSize: 13, padding: "9px" }}
                  >
                    {v === "public" ? "🌐 Public" : "🔒 Private"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="btn-primary"
          disabled={saving}
          style={{ width: "100%", justifyContent: "center", padding: "13px", fontSize: 15 }}
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </form>

      {/* Danger zone */}
      <div className="card" style={{ marginTop: 24, padding: 24, borderColor: "rgba(239,68,68,0.2)" }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: "#ef4444", marginBottom: 14 }}>Account</h2>
        <button
          className="btn-ghost"
          onClick={() => signOut({ callbackUrl: "/login" })}
          style={{ color: "#f87171", fontSize: 14 }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
