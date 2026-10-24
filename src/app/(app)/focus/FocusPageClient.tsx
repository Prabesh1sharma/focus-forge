"use client";

import { useState, useEffect, useCallback } from "react";
import { useTimer } from "@/hooks/useTimer";
import { formatCountdown } from "@/lib/utils";
import TimerSettingsModal, { TimerSettings } from "@/components/focus/TimerSettingsModal";
import {
  Play,
  Pause,
  Square,
  SkipForward,
  Settings,
  Coffee,
  Brain,
  CheckCircle,
  Volume2,
  VolumeX,
} from "lucide-react";

interface FocusPageClientProps {
  initialSettings: TimerSettings;
}

type TimerMode = "focus" | "short_break" | "long_break";

const MODE_LABELS: Record<TimerMode, string> = {
  focus: "Focus",
  short_break: "Short Break",
  long_break: "Long Break",
};

const MODE_COLORS: Record<TimerMode, string> = {
  focus: "#10b981",
  short_break: "#3b82f6",
  long_break: "#8b5cf6",
};

const MODE_ICONS: Record<TimerMode, React.ReactNode> = {
  focus: <Brain size={16} />,
  short_break: <Coffee size={16} />,
  long_break: <Coffee size={18} />,
};

export default function FocusPageClient({ initialSettings }: FocusPageClientProps) {
  const [settings, setSettings] = useState<TimerSettings>(initialSettings);
  const [currentMode, setCurrentMode] = useState<TimerMode>("focus");
  const [sessionCount, setSessionCount] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [label, setLabel] = useState("");
  const [confirmAbandon, setConfirmAbandon] = useState(false);

  const plannedSeconds =
    currentMode === "focus"
      ? settings.focusDurationMinutes * 60
      : currentMode === "short_break"
      ? settings.shortBreakMinutes * 60
      : settings.longBreakMinutes * 60;

  const handleSessionComplete = useCallback(
    async (sessionId: string, mode: TimerMode) => {
      if (mode === "focus") {
        setSessionCount((c) => c + 1);
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 5000);
        // Complete on server
        await fetch(`/api/sessions/${sessionId}/complete`, { method: "POST" });
        // Auto-transition to break
        if (settings.autoTransition) {
          const nextMode: TimerMode =
            (sessionCount + 1) % settings.sessionsBeforeLongBreak === 0
              ? "long_break"
              : "short_break";
          setCurrentMode(nextMode);
        }
      } else {
        // Break completed
        if (settings.autoTransition) {
          setCurrentMode("focus");
        }
      }
    },
    [settings, sessionCount]
  );

  const timer = useTimer({
    soundEnabled: settings.soundEnabled,
    soundVolume: settings.soundVolume,
    onSessionComplete: handleSessionComplete,
  });

  const displaySeconds = timer.activeSession ? timer.remaining : plannedSeconds;
  const displayProgress = timer.activeSession ? timer.progress : 0;
  const activeMode = (timer.activeSession?.sessionType as TimerMode) ?? currentMode;
  const modeColor = MODE_COLORS[activeMode];

  // SVG circle for countdown
  const RADIUS = 90;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const strokeOffset = CIRCUMFERENCE - (displayProgress / 100) * CIRCUMFERENCE;

  const handleStart = useCallback(async () => {
    await timer.startSession({
      sessionType: currentMode,
      label: label || undefined,
      plannedDurationSeconds: plannedSeconds,
    });
  }, [timer, currentMode, label, plannedSeconds]);

  async function handleSaveSettings(newSettings: TimerSettings) {
    const res = await fetch("/api/settings/timer", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newSettings),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error || "Failed to save timer settings");
    }
    setSettings(newSettings);
  }

  // Request notification permission
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "default"
    ) {
      Notification.requestPermission();
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === "Space") {
        e.preventDefault();
        if (!timer.activeSession) handleStart();
        else if (timer.activeSession.status === "active") timer.pauseSession();
        else if (timer.activeSession.status === "paused") timer.resumeSession();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [timer, handleStart]);

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)" }}>Focus Timer</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
            Session {sessionCount + 1} · Press Space to start/pause
          </p>
        </div>
        <button
          id="timer-settings-btn"
          onClick={() => setShowSettings(true)}
          className="btn-ghost"
          aria-label="Timer settings"
          title="Timer settings"
        >
          <Settings size={18} />
        </button>
      </div>

      {/* Celebration banner */}
      {showCelebration && (
        <div
          className="animate-celebrate"
          style={{
            background: "linear-gradient(135deg, rgba(5,150,105,0.2), rgba(16,185,129,0.1))",
            border: "1px solid var(--brand-700)",
            borderRadius: 12,
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <CheckCircle size={20} color="var(--brand-400)" />
          <div>
            <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 15 }}>
              🎉 Focus session complete!
            </div>
            <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
              Great work! Take a break, you earned it.
            </div>
          </div>
        </div>
      )}

      {/* Mode selector */}
      {!timer.activeSession && (
        <div style={{ display: "flex", gap: 8, background: "var(--surface-2)", padding: 4, borderRadius: 10 }}>
          {(["focus", "short_break", "long_break"] as TimerMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setCurrentMode(mode)}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                transition: "all 0.15s",
                background: currentMode === mode ? "var(--surface-4)" : "transparent",
                color: currentMode === mode ? MODE_COLORS[mode] : "var(--text-muted)",
              }}
            >
              {MODE_ICONS[mode]}
              {MODE_LABELS[mode]}
            </button>
          ))}
        </div>
      )}

      {/* Timer circle */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
        <div style={{ position: "relative", width: 240, height: 240 }}>
          <svg width="240" height="240" viewBox="0 0 240 240" style={{ transform: "rotate(-90deg)" }}>
            {/* Background track */}
            <circle
              cx="120" cy="120" r={RADIUS}
              fill="none"
              stroke="var(--surface-3)"
              strokeWidth="8"
            />
            {/* Progress arc */}
            <circle
              cx="120" cy="120" r={RADIUS}
              fill="none"
              stroke={modeColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={strokeOffset}
              className="timer-progress"
              style={{ opacity: timer.activeSession ? 1 : 0.3 }}
            />
          </svg>

          {/* Center content */}
          <div
            style={{
              position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            }}
          >
            {/* Mode indicator */}
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
              <div style={{ color: modeColor, display: "flex" }}>{MODE_ICONS[activeMode]}</div>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {MODE_LABELS[activeMode]}
              </span>
            </div>

            {/* Time display */}
            <span
              style={{
                fontSize: 52,
                fontWeight: 800,
                color: "var(--text-primary)",
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "-0.02em",
                lineHeight: 1,
              }}
            >
              {formatCountdown(displaySeconds)}
            </span>

            {/* Status indicator */}
            {timer.activeSession?.status === "paused" && (
              <span style={{ fontSize: 12, color: "#f59e0b", marginTop: 6, fontWeight: 600 }}>
                PAUSED
              </span>
            )}
          </div>
        </div>

        {/* Session label input */}
        {!timer.activeSession && (
          <input
            type="text"
            className="input"
            style={{ textAlign: "center", maxWidth: 280, fontSize: 14 }}
            placeholder="Session label (optional)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        )}

        {/* Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {!timer.activeSession ? (
            <button
              id="timer-start-btn"
              className="btn-primary"
              onClick={handleStart}
              disabled={timer.isLoading}
              style={{ padding: "14px 36px", fontSize: 16, borderRadius: 50 }}
            >
              <Play size={20} />
              Start {MODE_LABELS[currentMode]}
            </button>
          ) : (
            <>
              {/* Pause/Resume */}
              {timer.activeSession.status === "active" ? (
                <button
                  id="timer-pause-btn"
                  className="btn-secondary"
                  onClick={timer.pauseSession}
                  disabled={timer.isLoading}
                  style={{ padding: "12px 28px", fontSize: 15, borderRadius: 50 }}
                >
                  <Pause size={18} />
                  Pause
                </button>
              ) : (
                <button
                  id="timer-resume-btn"
                  className="btn-primary"
                  onClick={timer.resumeSession}
                  disabled={timer.isLoading}
                  style={{ padding: "12px 28px", fontSize: 15, borderRadius: 50 }}
                >
                  <Play size={18} />
                  Resume
                </button>
              )}

              {/* Skip break */}
              {timer.activeSession.sessionType !== "focus" && (
                <button
                  className="btn-ghost"
                  onClick={() => timer.completeSession()}
                  title="Skip break"
                >
                  <SkipForward size={18} />
                </button>
              )}

              {/* End session */}
              {confirmAbandon ? (
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    className="btn-ghost"
                    onClick={() => setConfirmAbandon(false)}
                    style={{ fontSize: 13 }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      setConfirmAbandon(false);
                      await timer.abandonSession();
                    }}
                    style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "rgba(239,68,68,0.15)", color: "#f87171", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
                  >
                    End session
                  </button>
                </div>
              ) : (
                <button
                  className="btn-ghost"
                  onClick={() => setConfirmAbandon(true)}
                  title="End session"
                >
                  <Square size={16} />
                </button>
              )}
            </>
          )}
        </div>

        {/* Sound toggle */}
        <button
          className="btn-ghost"
          onClick={() => setSettings((s) => ({ ...s, soundEnabled: !s.soundEnabled }))}
          style={{ fontSize: 13 }}
        >
          {settings.soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          Sound {settings.soundEnabled ? "on" : "off"}
        </button>
      </div>

      {/* Session progress dots */}
      <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
        {Array.from({ length: settings.sessionsBeforeLongBreak }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 8, height: 8, borderRadius: "50%",
              background: i < sessionCount % settings.sessionsBeforeLongBreak
                ? "var(--brand-500)"
                : "var(--surface-3)",
              transition: "background 0.3s",
            }}
          />
        ))}
      </div>

      {/* Settings popup modal */}
      <TimerSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onSave={handleSaveSettings}
      />
    </div>
  );
}
