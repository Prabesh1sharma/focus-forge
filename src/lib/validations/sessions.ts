import { z } from "zod";

export const startSessionSchema = z.object({
  sessionType: z
    .enum(["focus", "short_break", "long_break"])
    .default("focus"),
  label: z.string().max(50).optional(),
  roomId: z.string().optional(),
  plannedDurationSeconds: z
    .number()
    .min(60, "Session must be at least 1 minute")
    .max(7200, "Session cannot exceed 2 hours"),
});

export const completeSessionSchema = z.object({
  sessionId: z.string(),
});

export type StartSessionInput = z.infer<typeof startSessionSchema>;
