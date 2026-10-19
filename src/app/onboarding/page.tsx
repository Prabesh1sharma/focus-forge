"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Brain, BookOpen, Zap, ChevronRight } from "lucide-react";

const GOALS = [
  {
    id: "reading",
    icon: <BookOpen size={24} />,
    label: "Reading",
    desc: "Build a daily reading habit",
    color: "#3b82f6",
  },
  {
    id: "studying",
    icon: <Brain size={24} />,
    label: "Studying",
    desc: "Study consistently and retain more",
    color: "#8b5cf6",
  },
  {
    id: "deep_work",
    icon: <Zap size={24} />,
    label: "Deep Work",
    desc: "Do focused, distraction-free work",
    color: "#10b981",
  },
] as const;

const GOAL_OPTIONS = [30, 60, 90, 120, 180, 240];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedGoal, setSelectedGoal] = useState<"reading" | "studying" | "deep_work">("deep_work");
  const [dailyGoal, setDailyGoal] = useState(60);
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  const [saving, setSaving] = useState(false);

  async function handleComplete() {
    setSaving(true);
    try {
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primaryGoal: selectedGoal, dailyGoalMinutes: dailyGoal, timezone }),
      });
      router.push("/dashboard");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--surface-0)" }}>
      <div className="animate-fade-in" style={{ width: "100%", maxWidth: 520 }}>
        {/* Progress */}
        <div style={{ display: "flex", gap: 6, marginBottom: 40 }}>
          {[1, 2].map((s) => (
            <div
              key={s}
              style={{
                flex: 1, height: 3, borderRadius: 2,
                background: s <= step ? "var(--brand-500)" : "var(--surface-3)",
                transition: "background 0.3s",
              }}
            />
          ))}
        </div>

        {step === 1 ? (
          <>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", marginBottom: 8 }}>
              What&apos;s your primary goal?
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: 15, marginBottom: 28, lineHeight: 1.6 }}>
              We&apos;ll personalize your FocusForge experience around your main focus area.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
              {GOALS.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setSelectedGoal(g.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 16,
                    padding: "18px 20px", borderRadius: 12, cursor: "pointer",
                    border: `2px solid ${selectedGoal === g.id ? g.color : "var(--border)"}`,
                    background: selectedGoal === g.id ? `${g.color}15` : "var(--surface-1)",
                    transition: "all 0.15s",
                    textAlign: "left",
                  }}
                >
                  <div style={{ color: g.color, flexShrink: 0 }}>{g.icon}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>{g.label}</div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{g.desc}</div>
                  </div>
                  {selectedGoal === g.id && (
                    <div style={{ marginLeft: "auto", width: 20, height: 20, borderRadius: "50%", background: g.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6L5 9L10 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>

            <button
              className="btn-primary"
              onClick={() => setStep(2)}
              style={{ width: "100%", justifyContent: "center", padding: "14px", fontSize: 15 }}
            >
              Continue <ChevronRight size={16} />
            </button>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", marginBottom: 8 }}>
              Set your daily goal
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: 15, marginBottom: 28, lineHeight: 1.6 }}>
              How many minutes do you want to focus each day?
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 28 }}>
              {GOAL_OPTIONS.map((mins) => (
                <button
                  key={mins}
                  onClick={() => setDailyGoal(mins)}
                  style={{
                    padding: "16px 12px", borderRadius: 10, cursor: "pointer",
                    border: `2px solid ${dailyGoal === mins ? "var(--brand-500)" : "var(--border)"}`,
                    background: dailyGoal === mins ? "rgba(16,185,129,0.1)" : "var(--surface-1)",
                    color: dailyGoal === mins ? "var(--brand-400)" : "var(--text-primary)",
                    fontSize: 15, fontWeight: 700,
                    transition: "all 0.15s",
                  }}
                >
                  {mins}m
                </button>
              ))}
            </div>

            <div style={{ marginBottom: 28 }}>
              <label className="label">Custom daily goal (minutes)</label>
              <input
                type="number"
                className="input"
                min={5}
                max={720}
                value={dailyGoal}
                onChange={(e) => setDailyGoal(Number(e.target.value))}
              />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn-secondary" onClick={() => setStep(1)} style={{ flex: 1, justifyContent: "center", padding: "12px" }}>
                Back
              </button>
              <button
                className="btn-primary"
                onClick={handleComplete}
                disabled={saving}
                style={{ flex: 2, justifyContent: "center", padding: "12px", fontSize: 15 }}
              >
                {saving ? "Setting up…" : "Start forging 🚀"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
