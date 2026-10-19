import { describe, it, expect } from "vitest";
import {
  calculateStreaks,
} from "@/lib/stats/calculations";
import {
  calculateRemaining,
  computeActualFocusSeconds,
  getNextSessionType,
  getSessionTypeLabel,
} from "@/lib/timer/engine";
import {
  formatDuration,
  formatCountdown,
  generateSlug,
  getLocalDateString,
  validateSessionDuration,
  getHeatmapLevel,
} from "@/lib/utils";

// ─── Utils ────────────────────────────────────────────────────────────────────

describe("formatDuration", () => {
  it("formats seconds < 60", () => {
    expect(formatDuration(45)).toBe("45s");
  });
  it("formats minutes only", () => {
    expect(formatDuration(90)).toBe("1m");
  });
  it("formats hours only", () => {
    expect(formatDuration(3600)).toBe("1h");
  });
  it("formats hours and minutes", () => {
    expect(formatDuration(5400)).toBe("1h 30m");
  });
  it("formats zero seconds", () => {
    expect(formatDuration(0)).toBe("0s");
  });
});

describe("formatCountdown", () => {
  it("formats zero as 00:00", () => {
    expect(formatCountdown(0)).toBe("00:00");
  });
  it("formats 25 minutes", () => {
    expect(formatCountdown(1500)).toBe("25:00");
  });
  it("formats 5:30 remaining", () => {
    expect(formatCountdown(330)).toBe("05:30");
  });
  it("clamps negative values to 00:00", () => {
    expect(formatCountdown(-10)).toBe("00:00");
  });
});

describe("generateSlug", () => {
  it("converts to lowercase", () => {
    expect(generateSlug("Morning Study")).toBe("morning-study");
  });
  it("replaces spaces with hyphens", () => {
    expect(generateSlug("My Focus Room")).toBe("my-focus-room");
  });
  it("removes special characters", () => {
    expect(generateSlug("Room #1 @ 9am!")).toBe("room-1-9am");
  });
  it("trims trailing hyphens", () => {
    expect(generateSlug("Focus!!!")).toBe("focus");
  });
  it("limits to 50 characters", () => {
    const long = "a".repeat(100);
    expect(generateSlug(long).length).toBeLessThanOrEqual(50);
  });
});

describe("getHeatmapLevel", () => {
  it("returns 0 for zero minutes", () => {
    expect(getHeatmapLevel(0)).toBe(0);
  });
  it("returns 1 for 1-29 minutes", () => {
    expect(getHeatmapLevel(1)).toBe(1);
    expect(getHeatmapLevel(29)).toBe(1);
  });
  it("returns 2 for 30-59 minutes", () => {
    expect(getHeatmapLevel(30)).toBe(2);
    expect(getHeatmapLevel(59)).toBe(2);
  });
  it("returns 3 for 60-119 minutes", () => {
    expect(getHeatmapLevel(60)).toBe(3);
    expect(getHeatmapLevel(119)).toBe(3);
  });
  it("returns 4 for 120+ minutes", () => {
    expect(getHeatmapLevel(120)).toBe(4);
    expect(getHeatmapLevel(9999)).toBe(4);
  });
});

// ─── Timer Engine ─────────────────────────────────────────────────────────────

describe("calculateRemaining", () => {
  const baseTime = new Date("2024-01-15T10:00:00Z");

  it("returns 0 for completed sessions", () => {
    const state = {
      sessionId: "1",
      sessionType: "focus" as const,
      status: "completed" as const,
      startedAt: baseTime,
      expectedEndAt: new Date(baseTime.getTime() + 1500000),
      pausedDurationSeconds: 0,
      lastPausedAt: null,
      plannedDurationSeconds: 1500,
    };
    const result = calculateRemaining(state);
    expect(result.remainingSeconds).toBe(0);
    expect(result.isExpired).toBe(true);
    expect(result.progressPercent).toBe(100);
  });

  it("calculates remaining time for active session", () => {
    const now = new Date();
    const startedAt = new Date(now.getTime() - 300000); // started 5 minutes ago
    const state = {
      sessionId: "2",
      sessionType: "focus" as const,
      status: "active" as const,
      startedAt,
      expectedEndAt: new Date(startedAt.getTime() + 1500000),
      pausedDurationSeconds: 0,
      lastPausedAt: null,
      plannedDurationSeconds: 1500,
    };
    const result = calculateRemaining(state);
    // Should be roughly 20 minutes (1200s) remaining
    expect(result.remainingSeconds).toBeGreaterThan(1180);
    expect(result.remainingSeconds).toBeLessThanOrEqual(1200);
    expect(result.isExpired).toBe(false);
  });

  it("does not advance time while paused", () => {
    const now = new Date();
    const startedAt = new Date(now.getTime() - 300000); // started 5min ago
    const pausedAt = new Date(now.getTime() - 60000); // paused 1min ago
    const state = {
      sessionId: "3",
      sessionType: "focus" as const,
      status: "paused" as const,
      startedAt,
      expectedEndAt: new Date(startedAt.getTime() + 1500000),
      pausedDurationSeconds: 0,
      lastPausedAt: pausedAt,
      plannedDurationSeconds: 1500,
    };
    const result = calculateRemaining(state);
    // Elapsed = 5min - 1min paused = 4min = 240s elapsed, 1260s remaining
    expect(result.remainingSeconds).toBeGreaterThan(1240);
    expect(result.remainingSeconds).toBeLessThanOrEqual(1260);
  });

  it("marks expired when remaining is 0", () => {
    const now = new Date();
    const startedAt = new Date(now.getTime() - 2000000); // started way too long ago
    const state = {
      sessionId: "4",
      sessionType: "focus" as const,
      status: "active" as const,
      startedAt,
      expectedEndAt: new Date(startedAt.getTime() + 1500000),
      pausedDurationSeconds: 0,
      lastPausedAt: null,
      plannedDurationSeconds: 1500,
    };
    const result = calculateRemaining(state);
    expect(result.remainingSeconds).toBe(0);
    expect(result.isExpired).toBe(true);
  });
});

describe("computeActualFocusSeconds", () => {
  it("computes elapsed time minus paused time", () => {
    const startedAt = new Date("2024-01-15T10:00:00Z");
    const endedAt = new Date("2024-01-15T10:25:00Z"); // 25min elapsed
    const pausedDurationSeconds = 120; // 2min paused
    const planned = 1500; // 25min planned
    const result = computeActualFocusSeconds(
      startedAt,
      endedAt,
      pausedDurationSeconds,
      planned
    );
    // 1500 - 120 = 1380s
    expect(result).toBe(1380);
  });

  it("caps at planned + 5min tolerance", () => {
    const startedAt = new Date("2024-01-15T10:00:00Z");
    const endedAt = new Date("2024-01-15T11:00:00Z"); // 60min elapsed (way over)
    const pausedDurationSeconds = 0;
    const planned = 1500; // 25min planned
    const result = computeActualFocusSeconds(
      startedAt,
      endedAt,
      pausedDurationSeconds,
      planned
    );
    // Should be capped at 1500 + 300 = 1800
    expect(result).toBe(1800);
  });

  it("excludes all paused time", () => {
    const startedAt = new Date("2024-01-15T10:00:00Z");
    const endedAt = new Date("2024-01-15T10:30:00Z"); // 30min elapsed
    const pausedDurationSeconds = 1500; // 25min paused — should result in only 5min actual
    const planned = 1500;
    const result = computeActualFocusSeconds(
      startedAt,
      endedAt,
      pausedDurationSeconds,
      planned
    );
    expect(result).toBe(300); // 5min
  });

  it("returns 0 if paused exceeds elapsed", () => {
    const startedAt = new Date("2024-01-15T10:00:00Z");
    const endedAt = new Date("2024-01-15T10:05:00Z"); // 5min elapsed
    const pausedDurationSeconds = 600; // 10min paused (impossible but guard)
    const planned = 1500;
    const result = computeActualFocusSeconds(
      startedAt,
      endedAt,
      pausedDurationSeconds,
      planned
    );
    expect(result).toBe(0);
  });
});

describe("getNextSessionType", () => {
  it("returns short_break for sessions that aren't divisible by sessionsBeforeLong", () => {
    expect(getNextSessionType(1, 4)).toBe("short_break");
    expect(getNextSessionType(2, 4)).toBe("short_break");
    expect(getNextSessionType(3, 4)).toBe("short_break");
  });

  it("returns long_break when divisible by sessionsBeforeLong", () => {
    expect(getNextSessionType(4, 4)).toBe("long_break");
    expect(getNextSessionType(8, 4)).toBe("long_break");
  });

  it("handles sessionsBeforeLongBreak = 1 (every session)", () => {
    expect(getNextSessionType(1, 1)).toBe("long_break");
    expect(getNextSessionType(2, 1)).toBe("long_break");
  });
});

describe("getSessionTypeLabel", () => {
  it("returns correct labels", () => {
    expect(getSessionTypeLabel("focus")).toBe("Focus");
    expect(getSessionTypeLabel("short_break")).toBe("Short Break");
    expect(getSessionTypeLabel("long_break")).toBe("Long Break");
  });
});

// ─── Streak Calculations ──────────────────────────────────────────────────────

describe("calculateStreaks", () => {
  it("returns 0 streak for empty dates", () => {
    const result = calculateStreaks([], "2024-01-15");
    expect(result.currentStreak).toBe(0);
    expect(result.longestStreak).toBe(0);
  });

  it("returns streak of 1 for single day (today)", () => {
    const result = calculateStreaks(["2024-01-15"], "2024-01-15");
    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(1);
  });

  it("continues streak from yesterday", () => {
    // Today is Jan 15, had sessions on Jan 13, 14, 15
    const result = calculateStreaks(
      ["2024-01-13", "2024-01-14", "2024-01-15"],
      "2024-01-15"
    );
    expect(result.currentStreak).toBe(3);
    expect(result.longestStreak).toBe(3);
  });

  it("breaks streak on gap", () => {
    // Skipped Jan 14
    const result = calculateStreaks(
      ["2024-01-12", "2024-01-13", "2024-01-15"],
      "2024-01-15"
    );
    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(2);
  });

  it("streak from yesterday counts as current", () => {
    // Last session was yesterday (Jan 14), today nothing yet
    const result = calculateStreaks(
      ["2024-01-12", "2024-01-13", "2024-01-14"],
      "2024-01-15"
    );
    expect(result.currentStreak).toBe(3);
  });

  it("streak breaks if last activity is 2+ days ago", () => {
    const result = calculateStreaks(
      ["2024-01-12", "2024-01-13"],
      "2024-01-15"
    );
    expect(result.currentStreak).toBe(0);
  });

  it("correctly calculates longest streak across history", () => {
    const dates = [
      "2024-01-01",
      "2024-01-02",
      "2024-01-03",
      // gap Jan 4-9
      "2024-01-10",
      "2024-01-11",
    ];
    const result = calculateStreaks(dates, "2024-01-11");
    expect(result.longestStreak).toBe(3);
    expect(result.currentStreak).toBe(2);
  });

  it("handles duplicate dates gracefully", () => {
    const result = calculateStreaks(
      ["2024-01-14", "2024-01-14", "2024-01-15"],
      "2024-01-15"
    );
    expect(result.currentStreak).toBe(2);
  });

  it("calculates across month boundaries", () => {
    const result = calculateStreaks(
      ["2024-01-30", "2024-01-31", "2024-02-01"],
      "2024-02-01"
    );
    expect(result.currentStreak).toBe(3);
    expect(result.longestStreak).toBe(3);
  });
});

// ─── Session Validation ───────────────────────────────────────────────────────

describe("validateSessionDuration", () => {
  it("returns valid for correct session", () => {
    const startedAt = new Date("2024-01-15T10:00:00Z");
    const endedAt = new Date("2024-01-15T10:25:00Z");
    const result = validateSessionDuration(startedAt, endedAt, 0, 1500);
    expect(result.valid).toBe(true);
    expect(result.actualSeconds).toBe(1500); // capped at planned
  });

  it("is invalid when duration far exceeds planned + 5min tolerance", () => {
    const startedAt = new Date("2024-01-15T10:00:00Z");
    const endedAt = new Date("2024-01-15T12:00:00Z"); // 2h elapsed, planned 25min
    const result = validateSessionDuration(startedAt, endedAt, 0, 1500);
    // actual = 7200s, maxAllowed = 1500+300 = 1800s → invalid
    expect(result.valid).toBe(false);
    // actualSeconds is capped at plannedDurationSeconds
    expect(result.actualSeconds).toBe(1500);
  });
});
