import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores"
    ),
  displayName: z
    .string()
    .min(1, "Display name is required")
    .max(50, "Display name must be at most 50 characters"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password must be at most 100 characters"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password must be at most 100 characters"),
});

export const updateProfileSchema = z.object({
  displayName: z
    .string()
    .min(1, "Display name is required")
    .max(50, "Display name must be at most 50 characters")
    .optional(),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores"
    )
    .optional(),
  bio: z.string().max(200, "Bio must be at most 200 characters").optional(),
  timezone: z.string().optional(),
  dailyGoalMinutes: z
    .number()
    .min(5, "Daily goal must be at least 5 minutes")
    .max(720, "Daily goal cannot exceed 12 hours")
    .optional(),
  profileVisibility: z.enum(["public", "private"]).optional(),
  primaryGoal: z.enum(["reading", "studying", "deep_work"]).optional(),
});

export const timerSettingsSchema = z.object({
  focusDurationMinutes: z
    .number()
    .min(1)
    .max(120, "Focus duration cannot exceed 120 minutes"),
  shortBreakMinutes: z
    .number()
    .min(1)
    .max(30, "Short break cannot exceed 30 minutes"),
  longBreakMinutes: z
    .number()
    .min(1)
    .max(60, "Long break cannot exceed 60 minutes"),
  sessionsBeforeLongBreak: z
    .number()
    .min(1)
    .max(10, "Must be between 1 and 10"),
  autoTransition: z.boolean(),
  soundEnabled: z.boolean(),
  soundVolume: z.number().min(0).max(100),
});

export const onboardingSchema = z.object({
  primaryGoal: z.enum(["reading", "studying", "deep_work"]),
  dailyGoalMinutes: z
    .number()
    .min(5)
    .max(720),
  timezone: z.string(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type TimerSettingsInput = z.infer<typeof timerSettingsSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
