# FocusForge — Implementation Plan

## Repository Audit

The repo is a **clean Next.js 16 App Router** scaffold:
- Next.js 16.4.2 + React 19 + TypeScript
- Tailwind CSS v4 (via `@tailwindcss/turbopack`)
- No existing business logic — safe to build from scratch

---

## Technology Decisions

| Concern | Choice | Rationale |
|---|---|---|
| Framework | Next.js 16 App Router | Already installed |
| Styling | Tailwind CSS v4 + shadcn/ui | Requested; v4 already configured |
| Icons | Lucide React | Requested |
| Database | Neon Serverless PostgreSQL | Requested |
| ORM | Drizzle ORM | Requested |
| Auth | Auth.js v5 (next-auth@beta) | Best-maintained for Next.js App Router |
| Validation | Zod | Requested |
| Charts | Recharts (lightweight) + custom heatmap | Good API, tree-shakeable |
| Notifications | DB-backed in-app; browser Notification API | No polling needed day-1 |
| Timer sound | Howler.js or native AudioContext | Graceful degradation |
| Testing | Vitest + Playwright | Requested |
| Password hashing | bcryptjs | Used by Auth.js credentials provider |

---

## Project File Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   └── layout.tsx
│   ├── (app)/
│   │   ├── layout.tsx              ← sidebar + nav
│   │   ├── dashboard/page.tsx      ← rooms dashboard (default after login)
│   │   ├── focus/page.tsx          ← Pomodoro timer
│   │   ├── rooms/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   └── [slug]/
│   │   │       ├── page.tsx        ← overview
│   │   │       ├── leaderboard/page.tsx
│   │   │       ├── members/page.tsx
│   │   │       ├── activity/page.tsx
│   │   │       └── settings/page.tsx
│   │   ├── stats/page.tsx
│   │   ├── notifications/page.tsx
│   │   ├── profile/
│   │   │   ├── page.tsx            ← own profile
│   │   │   └── [username]/page.tsx ← public profile
│   │   └── settings/page.tsx
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── users/search/route.ts
│   │   ├── rooms/route.ts
│   │   ├── rooms/[id]/
│   │   │   ├── route.ts
│   │   │   ├── members/route.ts
│   │   │   ├── invite/route.ts
│   │   │   ├── invitations/route.ts
│   │   │   └── leaderboard/route.ts
│   │   ├── sessions/
│   │   │   ├── route.ts            ← start session
│   │   │   └── [id]/
│   │   │       ├── pause/route.ts
│   │   │       ├── resume/route.ts
│   │   │       ├── complete/route.ts
│   │   │       └── abandon/route.ts
│   │   ├── notifications/
│   │   │   ├── route.ts
│   │   │   └── [id]/read/route.ts
│   │   ├── stats/route.ts
│   │   └── heatmap/route.ts
│   ├── layout.tsx                  ← root layout
│   ├── page.tsx                    ← landing (redirects to /dashboard if authed)
│   └── globals.css
├── components/
│   ├── ui/                         ← shadcn primitives
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── MobileNav.tsx
│   │   └── UserMenu.tsx
│   ├── timer/
│   │   ├── TimerCircle.tsx
│   │   ├── TimerControls.tsx
│   │   ├── TimerSettings.tsx
│   │   └── SessionCompletion.tsx
│   ├── rooms/
│   │   ├── RoomCard.tsx
│   │   ├── RoomLeaderboard.tsx
│   │   ├── InviteUserModal.tsx
│   │   └── MemberList.tsx
│   ├── stats/
│   │   ├── HeatmapCalendar.tsx
│   │   ├── StatsCard.tsx
│   │   └── SessionHistory.tsx
│   ├── notifications/
│   │   └── NotificationItem.tsx
│   └── shared/
│       ├── Avatar.tsx
│       ├── ProgressRing.tsx
│       └── EmptyState.tsx
├── lib/
│   ├── db/
│   │   ├── schema.ts               ← Drizzle schema
│   │   ├── index.ts                ← Neon + Drizzle client
│   │   └── migrations/
│   ├── auth/
│   │   ├── config.ts               ← Auth.js config
│   │   └── session.ts              ← session helpers
│   ├── timer/
│   │   └── engine.ts               ← timestamp-based timer logic
│   ├── stats/
│   │   └── calculations.ts         ← streak, heatmap, aggregation
│   ├── validations/
│   │   ├── auth.ts
│   │   ├── rooms.ts
│   │   └── sessions.ts
│   └── utils.ts
├── hooks/
│   ├── useTimer.ts
│   ├── useNotifications.ts
│   └── useSession.ts
├── types/
│   └── index.ts
└── middleware.ts                   ← route protection
```

---

## Database Schema (Drizzle + PostgreSQL)

### Core Tables

1. **users** — `id, username(unique), displayName, email(unique), passwordHash, avatarUrl, bio, timezone, dailyGoalMinutes, primaryGoal, profileVisibility, onboardingCompleted, createdAt, updatedAt`
2. **accounts** — Auth.js OAuth accounts table
3. **sessions** — Auth.js sessions table  
4. **verification_tokens** — Auth.js email verification
5. **rooms** — `id, name, slug(unique), description, avatarColor, visibility, createdBy(→users), createdAt, updatedAt`
6. **room_memberships** — `id, roomId(→rooms), userId(→users), role, joinedAt` — UNIQUE(roomId, userId)
7. **room_invitations** — `id, roomId(→rooms), inviterId(→users), inviteeId(→users), status(pending/accepted/declined/cancelled), createdAt, respondedAt`
8. **focus_sessions** — `id, userId(→users), roomId(→rooms nullable), sessionType(focus/short_break/long_break), label, startedAt, endedAt, pausedDurationSeconds, status(active/paused/completed/abandoned), actualFocusSeconds, createdAt, updatedAt`
9. **daily_focus_aggregates** — `id, userId(→users), date(DATE), totalFocusSeconds, completedSessions, createdAt, updatedAt` — UNIQUE(userId, date)
10. **notifications** — `id, recipientId(→users), actorId(→users nullable), type, title, message, relatedEntityType, relatedEntityId, readAt, createdAt`

### Key Indexes
- `users.username` — for search and auth
- `users.email` — for auth
- `room_memberships(userId)`, `room_memberships(roomId)`
- `room_invitations(inviteeId, status)`, `room_invitations(roomId, inviteeId)` — prevent dupes
- `focus_sessions(userId, status, startedAt)`
- `focus_sessions(roomId, status, startedAt)`
- `daily_focus_aggregates(userId, date)`
- `notifications(recipientId, readAt, createdAt)`

---

## Timer Engine Design

### State persisted per session (DB)
```
startedAt, expectedEndAt, pausedDurationSeconds, lastPausedAt, status
```

### Client-side calculation
```
remaining = (expectedEndAt - now) - pausedDurationSeconds_accumulated
```

### Visibility change handling
- On `visibilitychange` → re-fetch session from server, recalculate
- On mount → check for `active` or `paused` session in DB
- Session completion validation: server checks `actualFocusSeconds <= (endedAt - startedAt) - pausedDurationSeconds`

### Duplicate prevention
- `complete` endpoint: `WHERE id = ? AND status = 'active'` with row-level lock (PostgreSQL `FOR UPDATE SKIP LOCKED`)
- Returns 409 if already completed

---

## Authentication Strategy

Using **Auth.js v5** (next-auth@beta) with:
- **Credentials provider** for email/password (bcryptjs hashing)
- JWT session strategy with encrypted token
- Middleware-based route protection
- `middleware.ts` redirects unauthenticated users to `/login`
- `middleware.ts` redirects authenticated users from `/` to `/dashboard`

Password reset: send email with tokenized link (using Resend or nodemailer). If no email service configured, omit this flow and document it.

---

## Heatmap Design

- 365 days × daily aggregates from `daily_focus_aggregates`
- 5 intensity levels: 0, 1–29 min, 30–59 min, 60–119 min, 120+ min
- Color ramp: `bg-slate-800` → `bg-emerald-900` → `bg-emerald-700` → `bg-emerald-500` → `bg-emerald-300`
- Grid: 53 columns (weeks) × 7 rows (days)
- Tooltip with date, total minutes, session count
- Month and weekday labels

---

## Leaderboard Calculation

SQL query pattern:
```sql
SELECT u.id, u.username, u.displayName, u.avatarUrl,
  SUM(fs.actualFocusSeconds) as totalSeconds,
  COUNT(*) FILTER (WHERE fs.status = 'completed') as sessionCount
FROM room_memberships rm
JOIN users u ON u.id = rm.userId
LEFT JOIN focus_sessions fs ON fs.userId = u.id 
  AND fs.roomId = rm.roomId
  AND fs.status = 'completed'
  AND fs.startedAt >= $periodStart
  AND fs.startedAt < $periodEnd
WHERE rm.roomId = $roomId
GROUP BY u.id, u.username, u.displayName, u.avatarUrl
ORDER BY totalSeconds DESC, u.username ASC  -- deterministic tie-break
```

---

## Phase Execution Order

### Phase 1 — Foundation (Day 1)
1. Install all dependencies
2. Configure shadcn/ui
3. Set up Drizzle schema + Neon connection
4. Create first migration
5. Configure Auth.js with credentials provider
6. Build middleware (route protection)
7. Build auth pages (login, register)
8. Build app shell (sidebar layout)

### Phase 2 — Core Focus (Day 2)
1. Timer settings persistence (user preferences)
2. Timer engine + useTimer hook
3. Focus session API routes (start/pause/resume/complete/abandon)
4. Timer UI (circle, controls, mode indicator)
5. Session completion handling (stats update, sound, notification)
6. Personal stats page (basic)

### Phase 3 — Social Features (Day 3)
1. Room creation + listing API
2. Room pages (overview, members, settings)
3. Username search API
4. Invitation workflow (send/accept/decline)
5. Notification system (DB + UI)
6. Room leaderboard

### Phase 4 — Profile & Motivation (Day 4)
1. Heatmap component
2. Profile page (own + public)
3. Streak calculation
4. Daily goal progress
5. Onboarding flow
6. Empty states + celebrations

### Phase 5 — Quality (Day 5)
1. Vitest unit tests (timer, streaks, leaderboard, stats)
2. Playwright e2e tests (auth, invitation flow, timer)
3. Authorization audit
4. Responsive polish
5. Setup documentation

---

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://...@...neon.tech/focusforge?sslmode=require

# Auth.js
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000

# Optional email (for password reset)
EMAIL_SERVER_HOST=
EMAIL_SERVER_PORT=
EMAIL_SERVER_USER=
EMAIL_SERVER_PASSWORD=
EMAIL_FROM=
```

---

## Key Product Decisions

1. **Timer state** — stored in DB, client re-derives from timestamps. Refresh-safe.
2. **Focused time counting** — only `completed` sessions, `actualFocusSeconds` field. Break time excluded.
3. **Room-session association** — a session can be associated with 0 or 1 room. Minutes are NOT double-counted across rooms.
4. **Daily aggregate table** — updated transactionally when a session is marked complete. Drift prevention: always reconcile from `focus_sessions` source of truth.
5. **Streak** — calculated from `daily_focus_aggregates`. Consecutive days where `totalFocusSeconds > 0`. Uses user's timezone.
6. **Profile visibility** — `public` profiles show heatmap and stats. `private` only show basic info.
7. **Invitation spam prevention** — unique constraint on `(roomId, inviteeId)` where status is `pending`. New invite blocked if one exists.
8. **Password reset** — implemented if SMTP env vars present; skipped gracefully otherwise.
