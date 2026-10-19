import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";

type NotificationType =
  | "room_invitation"
  | "invitation_accepted"
  | "invitation_declined"
  | "room_joined"
  | "room_left"
  | "goal_achieved"
  | "session_completed"
  | "streak_milestone";

interface CreateNotificationOptions {
  recipientId: string;
  actorId?: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  actionUrl?: string;
}

export async function createNotification(
  options: CreateNotificationOptions
): Promise<void> {
  await db.insert(notifications).values({
    recipientId: options.recipientId,
    actorId: options.actorId ?? null,
    type: options.type,
    title: options.title,
    message: options.message,
    relatedEntityType: options.relatedEntityType ?? null,
    relatedEntityId: options.relatedEntityId ?? null,
    actionUrl: options.actionUrl ?? null,
  });
}
