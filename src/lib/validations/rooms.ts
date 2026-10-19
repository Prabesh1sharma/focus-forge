import { z } from "zod";

export const createRoomSchema = z.object({
  name: z
    .string()
    .min(2, "Room name must be at least 2 characters")
    .max(50, "Room name must be at most 50 characters"),
  description: z
    .string()
    .max(200, "Description must be at most 200 characters")
    .optional(),
  avatarColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color")
    .optional(),
  visibility: z.enum(["public", "private"]).default("public"),
});

export const updateRoomSchema = z.object({
  name: z
    .string()
    .min(2, "Room name must be at least 2 characters")
    .max(50, "Room name must be at most 50 characters")
    .optional(),
  description: z
    .string()
    .max(200, "Description must be at most 200 characters")
    .optional(),
  avatarColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color")
    .optional(),
  visibility: z.enum(["public", "private"]).optional(),
});

export const inviteUserSchema = z.object({
  username: z.string().min(3).max(30),
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;
export type InviteUserInput = z.infer<typeof inviteUserSchema>;
