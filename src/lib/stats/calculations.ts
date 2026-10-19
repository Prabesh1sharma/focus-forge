import { db } from "@/lib/db";
import {
  focusSessions,
  dailyFocusAggregates,
  users,
} from "@/lib/db/schema";
import { eq, and, gte, lte, desc, sql, sum, count } from "drizzle-orm";
import { getLocalDateString } from "@/lib/utils";

export interface UserStats {
  lifetimeFocusSeconds: number;
  todayFocusSeconds: number;
  weekFocusSeconds: number;
  monthFocusSeconds: number;
  dailyAverageSeconds: number;
  completedSessions: number;
  longestSessionSeconds: number;
  currentStreak: number;
  longestStreak: number;
  todayGoalSeconds: number;
  dailyGoalMinutes: number;
}

/**
 * Get aggregated stats for a user
 */
export async function getUserStats(
  userId: string,
  timezone: string = "UTC",
  dailyGoalMinutes: number = 120
): Promise<UserStats> {
  const today = getLocalDateString(timezone);
  const now = new Date();

  // Week start (Sunday)
  const todayDate = new Date(today + "T00:00:00Z");
  const dayOfWeek = todayDate.getDay();
  const weekStartDate = new Date(todayDate);
  weekStartDate.setUTCDate(weekStartDate.getUTCDate() - dayOfWeek);
  const weekStart = weekStartDate.toISOString().slice(0, 10);

  // Month start
  const monthStart = today.slice(0, 7) + "-01";

  // Fetch from daily aggregates for efficiency
  const aggregates = await db
    .select()
    .from(dailyFocusAggregates)
    .where(eq(dailyFocusAggregates.userId, userId))
    .orderBy(desc(dailyFocusAggregates.date));

  const aggregateMap = new Map(
    aggregates.map((a) => [a.date, a])
  );

  const todayAgg = aggregateMap.get(today);
  const todayFocusSeconds = todayAgg?.totalFocusSeconds ?? 0;
  const completedSessionsToday = todayAgg?.completedSessions ?? 0;

  // Week total
  const weekFocusSeconds = aggregates
    .filter((a) => a.date >= weekStart && a.date <= today)
    .reduce((acc, a) => acc + a.totalFocusSeconds, 0);

  // Month total
  const monthFocusSeconds = aggregates
    .filter((a) => a.date >= monthStart && a.date <= today)
    .reduce((acc, a) => acc + a.totalFocusSeconds, 0);

  // Lifetime total
  const lifetimeFocusSeconds = aggregates.reduce(
    (acc, a) => acc + a.totalFocusSeconds,
    0
  );

  // Completed sessions (lifetime)
  const completedSessions = aggregates.reduce(
    (acc, a) => acc + a.completedSessions,
    0
  );

  // Daily average (based on days with at least 1 minute)
  const activeDays = aggregates.filter((a) => a.totalFocusSeconds > 0).length;
  const dailyAverageSeconds =
    activeDays > 0 ? Math.floor(lifetimeFocusSeconds / activeDays) : 0;

  // Longest session
  const [longestSession] = await db
    .select({ max: sql<number>`MAX(${focusSessions.actualFocusSeconds})` })
    .from(focusSessions)
    .where(
      and(
        eq(focusSessions.userId, userId),
        eq(focusSessions.status, "completed"),
        eq(focusSessions.sessionType, "focus")
      )
    );
  const longestSessionSeconds = longestSession?.max ?? 0;

  // Streak calculation
  const { currentStreak, longestStreak } = calculateStreaks(
    aggregates.map((a) => a.date),
    today
  );

  return {
    lifetimeFocusSeconds,
    todayFocusSeconds,
    weekFocusSeconds,
    monthFocusSeconds,
    dailyAverageSeconds,
    completedSessions,
    longestSessionSeconds,
    currentStreak,
    longestStreak,
    todayGoalSeconds: dailyGoalMinutes * 60,
    dailyGoalMinutes,
  };
}

/**
 * Calculate current and longest streaks from sorted date strings
 */
export function calculateStreaks(
  activeDates: string[],
  today: string
): { currentStreak: number; longestStreak: number } {
  if (activeDates.length === 0) return { currentStreak: 0, longestStreak: 0 };

  // Sort descending and deduplicate
  const sorted = [...new Set(activeDates)].sort().reverse();

  let currentStreak = 0;
  let longestStreak = 0;
  let streak = 0;
  let prevDate: string | null = null;

  // Current streak: consecutive days ending on today or yesterday
  const todayDate = new Date(today + "T00:00:00Z");
  const yesterday = new Date(todayDate);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  const mostRecent = sorted[0];
  if (mostRecent === today || mostRecent === yesterdayStr) {
    let checkDate = mostRecent === today ? today : yesterdayStr;
    currentStreak = 0;

    for (const date of sorted) {
      if (date === checkDate) {
        currentStreak++;
        const d = new Date(checkDate + "T00:00:00Z");
        d.setUTCDate(d.getUTCDate() - 1);
        checkDate = d.toISOString().slice(0, 10);
      } else {
        break;
      }
    }
  }

  // Longest streak: scan all dates
  const ascSorted = [...new Set(activeDates)].sort();
  streak = 0;
  prevDate = null;

  for (const date of ascSorted) {
    if (prevDate === null) {
      streak = 1;
    } else {
      const prev: Date = new Date(prevDate + "T00:00:00Z");
      prev.setUTCDate(prev.getUTCDate() + 1);
      const expectedNext: string = prev.toISOString().slice(0, 10);
      if (date === expectedNext) {
        streak++;
      } else {
        streak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, streak);
    prevDate = date;
  }

  return { currentStreak, longestStreak };
}

/**
 * Get heatmap data for a user (last 365 days)
 */
export async function getHeatmapData(
  userId: string,
  timezone: string = "UTC"
): Promise<{ date: string; minutes: number; sessions: number }[]> {
  const today = getLocalDateString(timezone);
  const startDate = new Date(today + "T00:00:00Z");
  startDate.setUTCDate(startDate.getUTCDate() - 364);
  const startStr = startDate.toISOString().slice(0, 10);

  const aggregates = await db
    .select({
      date: dailyFocusAggregates.date,
      totalFocusSeconds: dailyFocusAggregates.totalFocusSeconds,
      completedSessions: dailyFocusAggregates.completedSessions,
    })
    .from(dailyFocusAggregates)
    .where(
      and(
        eq(dailyFocusAggregates.userId, userId),
        gte(dailyFocusAggregates.date, startStr),
        lte(dailyFocusAggregates.date, today)
      )
    );

  const dataMap = new Map(
    aggregates.map((a) => [
      a.date,
      {
        minutes: Math.floor(a.totalFocusSeconds / 60),
        sessions: a.completedSessions,
      },
    ])
  );

  // Fill in all 365 days
  const result: { date: string; minutes: number; sessions: number }[] = [];
  const cursor = new Date(startDate);
  const endDate = new Date(today + "T00:00:00Z");

  while (cursor <= endDate) {
    const dateStr = cursor.toISOString().slice(0, 10);
    const data = dataMap.get(dateStr);
    result.push({
      date: dateStr,
      minutes: data?.minutes ?? 0,
      sessions: data?.sessions ?? 0,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return result;
}

/**
 * Update daily aggregate when a session is completed.
 * Uses upsert to avoid race conditions.
 */
export async function updateDailyAggregate(
  userId: string,
  date: string,
  focusSecondsToAdd: number
): Promise<void> {
  await db
    .insert(dailyFocusAggregates)
    .values({
      userId,
      date,
      totalFocusSeconds: focusSecondsToAdd,
      completedSessions: 1,
    })
    .onConflictDoUpdate({
      target: [dailyFocusAggregates.userId, dailyFocusAggregates.date],
      set: {
        totalFocusSeconds: sql`${dailyFocusAggregates.totalFocusSeconds} + ${focusSecondsToAdd}`,
        completedSessions: sql`${dailyFocusAggregates.completedSessions} + 1`,
        updatedAt: new Date(),
      },
    });
}
