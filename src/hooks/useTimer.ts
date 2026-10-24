"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { calculateRemaining, TimerState, playTimerSound } from "@/lib/timer/engine";

export type TimerMode = "focus" | "short_break" | "long_break";

interface UseTimerOptions {
  soundEnabled?: boolean;
  soundVolume?: number;
  onSessionComplete?: (sessionId: string, mode: TimerMode) => void;
}

interface ActiveSession {
  id: string;
  sessionType: TimerMode;
  status: "active" | "paused" | "completed" | "abandoned";
  startedAt: string;
  expectedEndAt: string;
  pausedDurationSeconds: number;
  lastPausedAt: string | null;
  plannedDurationSeconds: number;
}

export function useTimer(options: UseTimerOptions = {}) {
  const { soundEnabled = true, soundVolume = 80, onSessionComplete } = options;

  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);

  const completedRef = useRef(false); // Prevent duplicate completion calls
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const onSessionCompleteRef = useRef(onSessionComplete);

  useEffect(() => {
    onSessionCompleteRef.current = onSessionComplete;
  }, [onSessionComplete]);

  // Convert ActiveSession from API to TimerState for engine
  function toTimerState(s: ActiveSession): TimerState {
    return {
      sessionId: s.id,
      sessionType: s.sessionType,
      status: s.status,
      startedAt: new Date(s.startedAt),
      expectedEndAt: new Date(s.expectedEndAt),
      pausedDurationSeconds: s.pausedDurationSeconds,
      lastPausedAt: s.lastPausedAt ? new Date(s.lastPausedAt) : null,
      plannedDurationSeconds: s.plannedDurationSeconds,
    };
  }

  // Tick — recalculate from timestamps every second
  const tick = useCallback(() => {
    if (!activeSession || completedRef.current) return;
    if (activeSession.status === "paused") return;

    const state = toTimerState(activeSession);
    const calc = calculateRemaining(state);

    setRemaining(calc.remainingSeconds);
    setProgress(calc.progressPercent);

    if (calc.isExpired && !completedRef.current) {
      completedRef.current = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      const expiredSession = activeSession;
      // Immediately clear activeSession so the UI doesn't linger on 'active' / 'pause'
      setActiveSession(null);
      setRemaining(0);
      setProgress(0);
      setHasCompleted(true);

      if (soundEnabled) {
        playTimerSound(soundVolume);
      }

      // Request browser notification
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        const isFocus = expiredSession.sessionType === "focus";
        new Notification(
          isFocus ? "FocusForge — Session Complete! 🎉" : "FocusForge — Break Finished! ⚡",
          {
            body: isFocus
              ? "Great work! Take a break, you earned it."
              : "Break is over! Time to get back into flow.",
            icon: "/favicon.ico",
          }
        );
      }

      onSessionCompleteRef.current?.(expiredSession.id, expiredSession.sessionType);
    }
  }, [activeSession, soundEnabled, soundVolume]);

  // Start interval when session is active
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (activeSession && activeSession.status === "active") {
      // Recalculate once right away, then every second. The immediate
      // recalculation is deferred so the effect body stays side-effect free.
      const initialId = setTimeout(tick, 0);
      intervalRef.current = setInterval(tick, 1000);
      return () => {
        clearTimeout(initialId);
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }

    if (activeSession && activeSession.status === "paused") {
      // Show static remaining time for a paused session
      const state = toTimerState(activeSession);
      const calc = calculateRemaining(state);
      const pausedId = setTimeout(() => {
        setRemaining(calc.remainingSeconds);
        setProgress(calc.progressPercent);
      }, 0);
      return () => clearTimeout(pausedId);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeSession, tick]);

  // Handle visibility change — recalculate from server on tab focus
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible" && activeSession) {
        // Refetch active session to get accurate server state
        fetchCurrentSession();
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [activeSession]);

  // On mount — check for existing active session
  useEffect(() => {
    fetchCurrentSession();
  }, []);

  async function fetchCurrentSession() {
    try {
      const res = await fetch("/api/sessions");
      if (!res.ok) return;
      const data = await res.json();
      if (data.session) {
        const state = toTimerState(data.session);
        const calc = calculateRemaining(state);
        if (calc.isExpired) {
          completedRef.current = true;
          setActiveSession(null);
          setRemaining(0);
          setProgress(0);
          setHasCompleted(true);
          onSessionCompleteRef.current?.(data.session.id, data.session.sessionType);
          return;
        }

        completedRef.current = false;
        setHasCompleted(false);
        setActiveSession(data.session);
      } else {
        setActiveSession(null);
      }
    } catch (err) {
      console.error("Failed to fetch session:", err);
    }
  }

  async function startSession(options: {
    sessionType: TimerMode;
    label?: string;
    roomId?: string;
    plannedDurationSeconds: number;
  }) {
    setIsLoading(true);
    completedRef.current = false;
    setHasCompleted(false);

    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options),
      });
      if (!res.ok) throw new Error("Failed to start session");
      const data = await res.json();
      setActiveSession(data.session);
      return data.session;
    } catch (err) {
      console.error("Start session error:", err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }

  async function pauseSession() {
    if (!activeSession || activeSession.status !== "active") return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/sessions/${activeSession.id}/pause`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to pause");
      const data = await res.json();
      setActiveSession(data.session);
    } finally {
      setIsLoading(false);
    }
  }

  async function resumeSession() {
    if (!activeSession || activeSession.status !== "paused") return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/sessions/${activeSession.id}/resume`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to resume");
      const data = await res.json();
      completedRef.current = false;
      setActiveSession(data.session);
    } finally {
      setIsLoading(false);
    }
  }

  async function completeSession() {
    if (!activeSession) return null;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/sessions/${activeSession.id}/complete`, {
        method: "POST",
      });
      const data = await res.json();
      completedRef.current = false;
      setActiveSession(null);
      setHasCompleted(true);
      setProgress(0);
      setRemaining(0);
      return data;
    } finally {
      setIsLoading(false);
    }
  }

  async function abandonSession() {
    if (!activeSession) return;
    setIsLoading(true);
    try {
      await fetch(`/api/sessions/${activeSession.id}/abandon`, {
        method: "POST",
      });
      completedRef.current = false;
      setActiveSession(null);
      setHasCompleted(false);
      setProgress(0);
      setRemaining(0);
    } finally {
      setIsLoading(false);
    }
  }

  return {
    activeSession,
    remaining,
    progress,
    isLoading,
    hasCompleted,
    startSession,
    pauseSession,
    resumeSession,
    completeSession,
    abandonSession,
    fetchCurrentSession,
  };
}
