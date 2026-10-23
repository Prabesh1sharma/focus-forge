import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  uniqueIndex,
  index,
  primaryKey,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const roomVisibilityEnum = pgEnum("room_visibility", [
  "public",
  "private",
]);
export const roomRoleEnum = pgEnum("room_role", ["owner", "admin", "member"]);
export const invitationStatusEnum = pgEnum("invitation_status", [
  "pending",
  "accepted",
  "declined",
  "cancelled",
]);
export const joinRequestStatusEnum = pgEnum("join_request_status", [
  "pending",
  "accepted",
  "declined",
  "cancelled",
]);
export const sessionTypeEnum = pgEnum("session_type", [
  "focus",
  "short_break",
  "long_break",
]);
export const sessionStatusEnum = pgEnum("session_status", [
  "active",
  "paused",
  "completed",
  "abandoned",
]);
export const profileVisibilityEnum = pgEnum("profile_visibility", [
  "public",
  "private",
]);
export const primaryGoalEnum = pgEnum("primary_goal", [
  "reading",
  "studying",
  "deep_work",
]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "room_invitation",
  "invitation_accepted",
  "invitation_declined",
  "room_joined",
  "room_left",
  "goal_achieved",
  "session_completed",
  "streak_milestone",
]);

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = pgTable(
  "users",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    username: text("username").notNull().unique(),
    displayName: text("display_name").notNull(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash"),
    emailVerified: timestamp("email_verified", { mode: "date" }),
    avatarUrl: text("avatar_url"),
    bio: text("bio"),
    timezone: text("timezone").notNull().default("UTC"),
    dailyGoalMinutes: integer("daily_goal_minutes").notNull().default(120),
    primaryGoal: primaryGoalEnum("primary_goal").default("deep_work"),
    profileVisibility: profileVisibilityEnum("profile_visibility")
      .notNull()
      .default("public"),
    onboardingCompleted: boolean("onboarding_completed")
      .notNull()
      .default(false),
    // Timer settings
    focusDurationMinutes: integer("focus_duration_minutes")
      .notNull()
      .default(25),
    shortBreakMinutes: integer("short_break_minutes").notNull().default(5),
    longBreakMinutes: integer("long_break_minutes").notNull().default(15),
    sessionsBeforeLongBreak: integer("sessions_before_long_break")
      .notNull()
      .default(4),
    autoTransition: boolean("auto_transition").notNull().default(false),
    soundEnabled: boolean("sound_enabled").notNull().default(true),
    soundVolume: integer("sound_volume").notNull().default(80), // 0–100
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("users_username_idx").on(t.username),
    uniqueIndex("users_email_idx").on(t.email),
  ]
);

// ─── Auth.js adapter tables ───────────────────────────────────────────────────

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [
    primaryKey({ columns: [t.provider, t.providerAccountId] }),
    index("accounts_user_id_idx").on(t.userId),
  ]
);

export const authSessions = pgTable(
  "auth_sessions",
  {
    sessionToken: text("session_token").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => [index("auth_sessions_user_id_idx").on(t.userId)]
);

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })]
);

// ─── Rooms ────────────────────────────────────────────────────────────────────

export const rooms = pgTable(
  "rooms",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    avatarColor: text("avatar_color").notNull().default("#10b981"),
    visibility: roomVisibilityEnum("visibility").notNull().default("public"),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("rooms_slug_idx").on(t.slug),
    index("rooms_created_by_idx").on(t.createdBy),
    index("rooms_visibility_idx").on(t.visibility),
  ]
);

// ─── Room Memberships ─────────────────────────────────────────────────────────

export const roomMemberships = pgTable(
  "room_memberships",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    roomId: text("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: roomRoleEnum("role").notNull().default("member"),
    joinedAt: timestamp("joined_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("room_memberships_room_user_idx").on(t.roomId, t.userId),
    index("room_memberships_user_idx").on(t.userId),
    index("room_memberships_room_idx").on(t.roomId),
  ]
);

// ─── Room Invitations ─────────────────────────────────────────────────────────

export const roomInvitations = pgTable(
  "room_invitations",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    roomId: text("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    inviterId: text("inviter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    inviteeId: text("invitee_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: invitationStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    respondedAt: timestamp("responded_at", { mode: "date" }),
  },
  (t) => [
    // Prevent duplicate pending invitations
    index("room_invitations_invitee_status_idx").on(t.inviteeId, t.status),
    index("room_invitations_room_invitee_idx").on(t.roomId, t.inviteeId),
    index("room_invitations_room_idx").on(t.roomId),
  ]
);

// ─── Room Join Requests ────────────────────────────────────────────────────────

export const roomJoinRequests = pgTable(
  "room_join_requests",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    roomId: text("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: joinRequestStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    respondedAt: timestamp("responded_at", { mode: "date" }),
    respondedBy: text("responded_by").references(() => users.id, {
      onDelete: "set null",
    }),
  },
  (t) => [
    uniqueIndex("room_join_requests_room_user_idx").on(t.roomId, t.userId),
    index("room_join_requests_user_idx").on(t.userId),
    index("room_join_requests_room_idx").on(t.roomId),
    index("room_join_requests_room_status_idx").on(t.roomId, t.status),
  ]
);

// ─── Focus Sessions ───────────────────────────────────────────────────────────

export const focusSessions = pgTable(
  "focus_sessions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roomId: text("room_id").references(() => rooms.id, {
      onDelete: "set null",
    }),
    sessionType: sessionTypeEnum("session_type").notNull().default("focus"),
    label: text("label"), // e.g. "Reading", "Programming"
    startedAt: timestamp("started_at", { mode: "date" }).notNull(),
    expectedEndAt: timestamp("expected_end_at", { mode: "date" }).notNull(),
    endedAt: timestamp("ended_at", { mode: "date" }),
    pausedDurationSeconds: integer("paused_duration_seconds")
      .notNull()
      .default(0),
    lastPausedAt: timestamp("last_paused_at", { mode: "date" }),
    status: sessionStatusEnum("status").notNull().default("active"),
    actualFocusSeconds: integer("actual_focus_seconds").notNull().default(0),
    plannedDurationSeconds: integer("planned_duration_seconds").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("focus_sessions_user_idx").on(t.userId),
    index("focus_sessions_user_status_idx").on(t.userId, t.status),
    index("focus_sessions_user_started_idx").on(t.userId, t.startedAt),
    index("focus_sessions_room_idx").on(t.roomId),
    index("focus_sessions_room_started_idx").on(t.roomId, t.startedAt),
  ]
);

// ─── Daily Focus Aggregates ───────────────────────────────────────────────────

export const dailyFocusAggregates = pgTable(
  "daily_focus_aggregates",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: text("date").notNull(), // ISO date string: "2024-01-15" in user's timezone
    totalFocusSeconds: integer("total_focus_seconds").notNull().default(0),
    completedSessions: integer("completed_sessions").notNull().default(0),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("daily_focus_user_date_idx").on(t.userId, t.date),
    index("daily_focus_user_idx").on(t.userId),
  ]
);

// ─── Notifications ────────────────────────────────────────────────────────────

export const notifications = pgTable(
  "notifications",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    recipientId: text("recipient_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    actorId: text("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    type: notificationTypeEnum("type").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    relatedEntityType: text("related_entity_type"), // "room", "session", etc.
    relatedEntityId: text("related_entity_id"),
    actionUrl: text("action_url"),
    readAt: timestamp("read_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("notifications_recipient_idx").on(t.recipientId),
    index("notifications_recipient_read_idx").on(t.recipientId, t.readAt),
    index("notifications_recipient_created_idx").on(
      t.recipientId,
      t.createdAt
    ),
  ]
);

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  authSessions: many(authSessions),
  roomMemberships: many(roomMemberships),
  roomsCreated: many(rooms),
  focusSessions: many(focusSessions),
  dailyAggregates: many(dailyFocusAggregates),
  sentInvitations: many(roomInvitations, { relationName: "inviter" }),
  receivedInvitations: many(roomInvitations, { relationName: "invitee" }),
  sentJoinRequests: many(roomJoinRequests, { relationName: "requester" }),
  notifications: many(notifications, { relationName: "recipient" }),
}));

export const roomsRelations = relations(rooms, ({ one, many }) => ({
  creator: one(users, {
    fields: [rooms.createdBy],
    references: [users.id],
  }),
  memberships: many(roomMemberships),
  invitations: many(roomInvitations),
  joinRequests: many(roomJoinRequests),
  focusSessions: many(focusSessions),
}));

export const roomMembershipsRelations = relations(
  roomMemberships,
  ({ one }) => ({
    room: one(rooms, {
      fields: [roomMemberships.roomId],
      references: [rooms.id],
    }),
    user: one(users, {
      fields: [roomMemberships.userId],
      references: [users.id],
    }),
  })
);

export const roomInvitationsRelations = relations(
  roomInvitations,
  ({ one }) => ({
    room: one(rooms, {
      fields: [roomInvitations.roomId],
      references: [rooms.id],
    }),
    inviter: one(users, {
      fields: [roomInvitations.inviterId],
      references: [users.id],
      relationName: "inviter",
    }),
    invitee: one(users, {
      fields: [roomInvitations.inviteeId],
      references: [users.id],
      relationName: "invitee",
    }),
  })
);

export const roomJoinRequestsRelations = relations(
  roomJoinRequests,
  ({ one }) => ({
    room: one(rooms, {
      fields: [roomJoinRequests.roomId],
      references: [rooms.id],
    }),
    user: one(users, {
      fields: [roomJoinRequests.userId],
      references: [users.id],
      relationName: "requester",
    }),
    responder: one(users, {
      fields: [roomJoinRequests.respondedBy],
      references: [users.id],
    }),
  })
);

export const focusSessionsRelations = relations(focusSessions, ({ one }) => ({
  user: one(users, {
    fields: [focusSessions.userId],
    references: [users.id],
  }),
  room: one(rooms, {
    fields: [focusSessions.roomId],
    references: [rooms.id],
  }),
}));

export const dailyFocusAggregatesRelations = relations(
  dailyFocusAggregates,
  ({ one }) => ({
    user: one(users, {
      fields: [dailyFocusAggregates.userId],
      references: [users.id],
    }),
  })
);

export const notificationsRelations = relations(notifications, ({ one }) => ({
  recipient: one(users, {
    fields: [notifications.recipientId],
    references: [users.id],
    relationName: "recipient",
  }),
  actor: one(users, {
    fields: [notifications.actorId],
    references: [users.id],
    relationName: "actor",
  }),
}));

// ─── Type exports ─────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Room = typeof rooms.$inferSelect;
export type NewRoom = typeof rooms.$inferInsert;
export type RoomMembership = typeof roomMemberships.$inferSelect;
export type RoomInvitation = typeof roomInvitations.$inferSelect;
export type RoomJoinRequest = typeof roomJoinRequests.$inferSelect;
export type FocusSession = typeof focusSessions.$inferSelect;
export type NewFocusSession = typeof focusSessions.$inferInsert;
export type DailyFocusAggregate = typeof dailyFocusAggregates.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
