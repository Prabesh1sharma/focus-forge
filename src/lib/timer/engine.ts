/**
 * Timer engine — all timestamp-based calculations.
 * No setInterval as source of truth; times are computed from stored timestamps.
 */

export interface TimerState {
  sessionId: string;
  sessionType: "focus" | "short_break" | "long_break";
  status: "active" | "paused" | "completed" | "abandoned";
  startedAt: Date;
  expectedEndAt: Date;
  pausedDurationSeconds: number;
  lastPausedAt: Date | null;
  plannedDurationSeconds: number;
}

export interface TimerCalculation {
  remainingSeconds: number;
  elapsedSeconds: number;
  progressPercent: number;
  isExpired: boolean;
}

/**
 * Calculate remaining time from persisted timestamps.
 * This is the canonical timer calculation — used on client and server.
 */
export function calculateRemaining(state: TimerState): TimerCalculation {
  const now = new Date();

  if (state.status === "completed" || state.status === "abandoned") {
    return {
      remainingSeconds: 0,
      elapsedSeconds: state.plannedDurationSeconds,
      progressPercent: 100,
      isExpired: true,
    };
  }

  if (state.status === "paused") {
    // While paused, time does not advance
    const totalPaused =
      state.pausedDurationSeconds +
      (state.lastPausedAt
        ? Math.floor((now.getTime() - state.lastPausedAt.getTime()) / 1000)
        : 0);

    const elapsed = Math.floor(
      (now.getTime() - state.startedAt.getTime()) / 1000
    ) - totalPaused;

    const remaining = Math.max(0, state.plannedDurationSeconds - elapsed);
    const progress = Math.min(
      100,
      Math.floor((elapsed / state.plannedDurationSeconds) * 100)
    );

    return {
      remainingSeconds: remaining,
      elapsedSeconds: Math.max(0, elapsed),
      progressPercent: progress,
      isExpired: remaining === 0,
    };
  }

  // Active: time advances in real time
  const elapsed = Math.floor(
    (now.getTime() - state.startedAt.getTime()) / 1000
  ) - state.pausedDurationSeconds;

  const remaining = Math.max(0, state.plannedDurationSeconds - elapsed);
  const progress = Math.min(
    100,
    Math.floor((elapsed / state.plannedDurationSeconds) * 100)
  );

  return {
    remainingSeconds: remaining,
    elapsedSeconds: Math.max(0, elapsed),
    progressPercent: progress,
    isExpired: remaining === 0,
  };
}

/**
 * Calculate the actual eligible focus seconds when completing a session.
 * Server-side validation to prevent duration manipulation.
 */
export function computeActualFocusSeconds(
  startedAt: Date,
  endedAt: Date,
  pausedDurationSeconds: number,
  plannedDurationSeconds: number
): number {
  const totalElapsed = Math.floor(
    (endedAt.getTime() - startedAt.getTime()) / 1000
  );
  const active = Math.max(0, totalElapsed - pausedDurationSeconds);
  // Cap at planned duration + 5min tolerance (clock drift)
  return Math.min(active, plannedDurationSeconds + 300);
}

/**
 * Determine the next session type based on completed focus sessions
 */
export function getNextSessionType(
  completedFocusSessions: number,
  sessionsBeforeLongBreak: number
): "short_break" | "long_break" {
  return completedFocusSessions % sessionsBeforeLongBreak === 0
    ? "long_break"
    : "short_break";
}

/**
 * Get display label for a session type
 */
export function getSessionTypeLabel(
  type: "focus" | "short_break" | "long_break"
): string {
  switch (type) {
    case "focus":
      return "Focus";
    case "short_break":
      return "Short Break";
    case "long_break":
      return "Long Break";
  }
}

/**
 * Timer sound frequencies for different events
 * Uses Web Audio API oscillator for a clean bell sound
 */
export function playTimerSound(volume: number = 80): void {
  try {
    const AudioContextClass =
      window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(
      volume / 100,
      ctx.currentTime + 0.01
    );

    // Bell-like sound: 3 oscillators
    const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5
    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.connect(gainNode);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      const delay = i * 0.1;
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.8);

      gainNode.gain.setValueAtTime(volume / 100, ctx.currentTime + delay);
      gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + delay + 0.8
      );
    });

    // Close context after sound finishes
    setTimeout(() => ctx.close(), 3000);
  } catch (err) {
    console.warn("Timer sound failed:", err);
  }
}
