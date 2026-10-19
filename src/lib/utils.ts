import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistance, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format seconds as "Xh Ym" or "Zm" 
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/**
 * Format seconds as MM:SS for timer display
 */
export function formatCountdown(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, "0")}:${String(rem).padStart(2, "0")}`;
}

/**
 * Generate a URL-safe slug from a room name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50);
}

/**
 * Get user's current local date in ISO format (YYYY-MM-DD) for their timezone
 */
export function getLocalDateString(timezone: string = "UTC"): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(
    new Date()
  );
}

/**
 * Get the start of a period (day/week/month) in UTC milliseconds
 * Returns a UTC Date representing the start of the period in the user's timezone.
 */
export function getPeriodStart(
  period: "today" | "week" | "month" | "all",
  timezone: string = "UTC"
): Date | null {
  if (period === "all") return null;

  const now = new Date();
  // Get current local date string in user's timezone (YYYY-MM-DD)
  const localStr = now.toLocaleDateString("en-CA", { timeZone: timezone });
  const [y, m, d] = localStr.split("-").map(Number);

  if (period === "today") {
    // Create a UTC date that corresponds to midnight in the user's timezone
    const localMidnight = new Date(`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}T00:00:00`);
    // Get the offset between local midnight and UTC
    const tzOffset = new Date(localStr + "T00:00:00").getTimezoneOffset() * 60 * 1000;
    return new Date(localMidnight.getTime() + tzOffset);
  }

  const localMidnight = new Date(`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}T00:00:00`);

  if (period === "week") {
    const dayOfWeek = localMidnight.getDay(); // 0 = Sunday
    localMidnight.setDate(localMidnight.getDate() - dayOfWeek);
    return localMidnight;
  }

  if (period === "month") {
    return new Date(`${y}-${String(m).padStart(2, "0")}-01T00:00:00`);
  }

  return null;
}

/**
 * Relative time string
 */
export function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return formatDistance(d, new Date(), { addSuffix: true });
}

/**
 * Format a date nicely
 */
export function formatDate(date: Date | string, fmt = "MMM d, yyyy"): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, fmt);
}

/**
 * Get initials from a display name
 */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Validate that a session's reported elapsed time is plausible
 * Server-side check to prevent cheating
 */
export function validateSessionDuration(
  startedAt: Date,
  endedAt: Date,
  pausedDurationSeconds: number,
  plannedDurationSeconds: number
): { valid: boolean; actualSeconds: number } {
  const totalElapsed = Math.floor(
    (endedAt.getTime() - startedAt.getTime()) / 1000
  );
  const actualSeconds = Math.max(
    0,
    totalElapsed - pausedDurationSeconds
  );

  // Must not exceed planned duration by more than 5 minutes (clock drift tolerance)
  const maxAllowed = plannedDurationSeconds + 300;
  const valid = actualSeconds >= 0 && actualSeconds <= maxAllowed;

  return { valid, actualSeconds: Math.min(actualSeconds, plannedDurationSeconds) };
}

/**
 * Generate avatar URL using DiceBear or a simple fallback
 */
export function getAvatarUrl(
  username: string,
  avatarUrl?: string | null
): string {
  if (avatarUrl) return avatarUrl;
  return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(username)}&backgroundColor=059669&textColor=ffffff`;
}

/**
 * Heatmap intensity level (0–4) from minutes
 * 0: no activity
 * 1: 1–29 min
 * 2: 30–59 min
 * 3: 60–119 min
 * 4: 120+ min
 */
export function getHeatmapLevel(minutes: number): 0 | 1 | 2 | 3 | 4 {
  if (minutes === 0) return 0;
  if (minutes < 30) return 1;
  if (minutes < 60) return 2;
  if (minutes < 120) return 3;
  return 4;
}

export const HEATMAP_COLORS = [
  "bg-slate-800",        // 0 - no activity
  "bg-emerald-900",      // 1 - 1–29 min
  "bg-emerald-700",      // 2 - 30–59 min
  "bg-emerald-500",      // 3 - 60–119 min
  "bg-emerald-300",      // 4 - 120+ min
] as const;

export const HEATMAP_COLORS_HEX = [
  "#1e293b",  // 0 - slate-800
  "#064e3b",  // 1 - emerald-900
  "#047857",  // 2 - emerald-700
  "#10b981",  // 3 - emerald-500
  "#6ee7b7",  // 4 - emerald-300
] as const;
