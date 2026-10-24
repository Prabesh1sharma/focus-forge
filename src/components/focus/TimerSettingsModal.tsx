"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Settings,
  X,
  Brain,
  Coffee,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
  AlertCircle,
} from "lucide-react";

export interface TimerSettings {
  focusDurationMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  sessionsBeforeLongBreak: number;
  autoTransition: boolean;
  soundEnabled: boolean;
  soundVolume: number;
}

export const DEFAULT_TIMER_SETTINGS: TimerSettings = {
  focusDurationMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsBeforeLongBreak: 4,
  autoTransition: false,
  soundEnabled: true,
  soundVolume: 80,
};

interface TimerSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: TimerSettings;
  onSave: (newSettings: TimerSettings) => Promise<void>;
}

export default function TimerSettingsModal({
  isOpen,
  onClose,
  settings,
  onSave,
}: TimerSettingsModalProps) {
  const [draft, setDraft] = useState<TimerSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync draft when opened or when base settings change
  useEffect(() => {
    if (isOpen) {
      setDraft(settings);
      setError(null);
    }
  }, [isOpen, settings]);

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) {
        onClose();
      }
    },
    [onClose, saving]
  );

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleKeyDown]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await onSave(draft);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  function handleResetDefaults() {
    setDraft(DEFAULT_TIMER_SETTINGS);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="timer-settings-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) {
          onClose();
        }
      }}
    >
      <div
        className="animate-slide-in-up"
        style={{
          background: "var(--surface-1)",
          border: "1px solid var(--border-strong)",
          borderRadius: 16,
          width: "100%",
          maxWidth: 540,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow:
            "0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px var(--border)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "rgba(16, 185, 129, 0.12)",
                border: "1px solid rgba(16, 185, 129, 0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--brand-400)",
                flexShrink: 0,
              }}
            >
              <Settings size={20} />
            </div>
            <div>
              <h2
                id="timer-settings-title"
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  margin: 0,
                }}
              >
                Timer Settings
              </h2>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-muted)",
                  margin: "2px 0 0",
                }}
              >
                Configure session durations, intervals, and audio
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="btn-ghost"
            aria-label="Close settings"
            style={{ padding: 8, borderRadius: 8 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div
          style={{
            padding: "22px 24px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          {error && (
            <div
              style={{
                background: "rgba(239, 68, 68, 0.12)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                borderRadius: 10,
                padding: "10px 14px",
                fontSize: 13,
                color: "#f87171",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Slider Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
              gap: "16px 20px",
            }}
          >
            <ModalSlider
              label="Focus Duration"
              icon={<Brain size={14} color="var(--brand-400)" />}
              value={draft.focusDurationMinutes}
              min={1}
              max={120}
              step={1}
              unit=" min"
              onChange={(v) =>
                setDraft((d) => ({ ...d, focusDurationMinutes: v }))
              }
            />

            <ModalSlider
              label="Short Break"
              icon={<Coffee size={14} color="#3b82f6" />}
              value={draft.shortBreakMinutes}
              min={1}
              max={30}
              step={1}
              unit=" min"
              onChange={(v) =>
                setDraft((d) => ({ ...d, shortBreakMinutes: v }))
              }
            />

            <ModalSlider
              label="Long Break"
              icon={<Coffee size={14} color="#8b5cf6" />}
              value={draft.longBreakMinutes}
              min={5}
              max={60}
              step={1}
              unit=" min"
              onChange={(v) =>
                setDraft((d) => ({ ...d, longBreakMinutes: v }))
              }
            />

            <ModalSlider
              label="Sessions Before Long Break"
              icon={<RotateCcw size={14} color="var(--text-muted)" />}
              value={draft.sessionsBeforeLongBreak}
              min={1}
              max={10}
              step={1}
              unit=" sessions"
              onChange={(v) =>
                setDraft((d) => ({ ...d, sessionsBeforeLongBreak: v }))
              }
            />

            <div style={{ gridColumn: "1 / -1" }}>
              <ModalSlider
                label="Sound Volume"
                icon={
                  draft.soundVolume === 0 ? (
                    <VolumeX size={14} color="var(--text-muted)" />
                  ) : (
                    <Volume2 size={14} color="var(--brand-400)" />
                  )
                }
                value={draft.soundVolume}
                min={0}
                max={100}
                step={5}
                unit="%"
                onChange={(v) =>
                  setDraft((d) => ({
                    ...d,
                    soundVolume: v,
                    soundEnabled: v > 0 ? d.soundEnabled : false,
                  }))
                }
              />
            </div>
          </div>

          {/* Toggle Switches */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              background: "var(--surface-2)",
              borderRadius: 12,
              padding: "16px",
              border: "1px solid var(--border)",
            }}
          >
            {/* Sound Enabled */}
            <label
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              <input
                type="checkbox"
                checked={draft.soundEnabled}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, soundEnabled: e.target.checked }))
                }
                style={{
                  accentColor: "var(--brand-500)",
                  width: 18,
                  height: 18,
                  marginTop: 2,
                  cursor: "pointer",
                }}
              />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                  }}
                >
                  Enable Sound Notifications
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  Play audio alerts when sessions start, pause, and complete
                </div>
              </div>
            </label>

            <div style={{ height: 1, background: "var(--border)" }} />

            {/* Auto Transition */}
            <label
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              <input
                type="checkbox"
                checked={draft.autoTransition}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, autoTransition: e.target.checked }))
                }
                style={{
                  accentColor: "var(--brand-500)",
                  width: 18,
                  height: 18,
                  marginTop: 2,
                  cursor: "pointer",
                }}
              />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                  }}
                >
                  Auto-Transition Sessions
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  Automatically transition between focus intervals and breaks
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid var(--border)",
            background: "var(--surface-1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <button
            type="button"
            onClick={handleResetDefaults}
            disabled={saving}
            className="btn-ghost"
            style={{ fontSize: 13, padding: "8px 12px" }}
            title="Reset settings to defaults"
          >
            <Sparkles size={14} />
            Reset Defaults
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="btn-secondary"
              style={{ fontSize: 13, padding: "8px 16px" }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="btn-primary"
              style={{ fontSize: 13, padding: "8px 20px" }}
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModalSlider({
  label,
  icon,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="form-group" style={{ margin: 0 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 6,
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-secondary)",
          }}
        >
          {icon}
          {label}
        </span>
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "var(--brand-400)",
            background: "var(--surface-3)",
            padding: "2px 8px",
            borderRadius: 6,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          width: "100%",
          accentColor: "var(--brand-500)",
          cursor: "pointer",
        }}
      />
    </div>
  );
}
