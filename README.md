# FocusForge 🔥

> **Forge your focus. Build your streak.**

A production-quality social focus & reading tracker built with Next.js App Router, Neon PostgreSQL, Drizzle ORM, and Auth.js v5.

---

## Features

| Feature | Status |
|---|---|
| ✅ Email/password authentication | Done |
| ✅ User registration + onboarding | Done |
| ✅ Timestamp-based Pomodoro timer | Done |
| ✅ Pause / Resume / Abandon sessions | Done |
| ✅ Server-validated session completion | Done |
| ✅ Daily / weekly / monthly stats | Done |
| ✅ 365-day activity heatmap | Done |
| ✅ Streak calculation (current + longest) | Done |
| ✅ Accountability rooms (public/private) | Done |
| ✅ Room invitations with notifications | Done |
| ✅ Room leaderboard (4 periods) | Done |
| ✅ In-app persistent notifications | Done |
| ✅ Username search | Done |
| ✅ User profile + heatmap | Done |
| ✅ Settings (profile, timer, goal, timezone) | Done |
| ✅ Browser notifications on session complete | Done |
| ✅ Web Audio API bell sound | Done |
| ✅ Mobile-responsive (sidebar + bottom nav) | Done |
| ✅ Dark mode design system | Done |
| ✅ 42 Vitest unit tests | Done |
| ✅ Playwright e2e test suite | Done |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 App Router |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 + Custom CSS Variables |
| Icons | Lucide React |
| Database | Neon Serverless PostgreSQL |
| ORM | Drizzle ORM |
| Auth | Auth.js v5 (next-auth@beta) |
| Validation | Zod v4 |
| Unit Testing | Vitest |
| E2E Testing | Playwright |
| Timer | Timestamp-based (no drift) |
| Sound | Web Audio API synthesized bell |

---

## Getting Started

### 1. Clone & Install

```bash
git clone <repo-url>
cd focus-forge
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Neon PostgreSQL connection string
DATABASE_URL=postgresql://user:password@host.neon.tech/dbname?sslmode=require

# Generate with: openssl rand -base64 32
NEXTAUTH_SECRET=your_random_secret_here

# Used for email-based features (optional)
NEXTAUTH_URL=http://localhost:3000
```

### 3. Run database migrations

```bash
npm run db:push       # Push schema directly (dev)
# OR
npm run db:generate   # Generate migration files
npm run db:migrate    # Apply migrations
```

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm test` | Run Vitest unit tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run test:e2e` | Run Playwright end-to-end tests |
| `npm run test:e2e:ui` | Run Playwright with interactive UI |
| `npm run db:generate` | Generate Drizzle migration files |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:push` | Push schema to DB directly (dev only) |
| `npm run db:studio` | Open Drizzle Studio (DB browser) |

---

## Project Structure

```
src/
├── app/
│   ├── (app)/              # Authenticated app routes
│   │   ├── dashboard/      # Room list + daily stats
│   │   ├── focus/          # Pomodoro timer
│   │   ├── stats/          # Statistics + heatmap
│   │   ├── notifications/  # Notification inbox
│   │   ├── profile/        # Public profile
│   │   ├── settings/       # User settings
│   │   └── rooms/          # Room creation + detail
│   │       ├── new/
│   │       └── [slug]/
│   ├── (auth)/             # Unauthenticated routes
│   │   ├── login/
│   │   ├── register/
│   │   └── forgot-password/
│   ├── onboarding/         # Post-registration onboarding
│   └── api/                # Route handlers
│       ├── auth/
│       ├── sessions/       # Start, pause, resume, complete, abandon
│       ├── rooms/          # CRUD, invite, leaderboard
│       ├── notifications/  # List, mark read
│       ├── profile/        # Update profile
│       ├── stats/          # User statistics
│       ├── heatmap/        # 365-day activity data
│       └── settings/timer/ # Timer preferences
├── components/
│   ├── layout/             # Sidebar, MobileNav
│   └── stats/              # HeatmapCalendar
├── hooks/
│   └── useTimer.ts         # Timestamp-based timer hook
└── lib/
    ├── auth/               # Auth.js configuration
    ├── db/                 # Drizzle ORM schema + client
    ├── stats/              # Stats calculations + streaks
    ├── timer/              # Timer engine + Web Audio
    ├── validations/        # Zod schemas
    ├── notifications.ts    # Notification helper
    └── utils.ts            # Core utilities
tests/
├── unit/                   # Vitest unit tests (42 tests)
└── e2e/                    # Playwright e2e tests
```

---

## Timer Architecture

The Pomodoro timer is **timestamp-based** — it stores `startedAt`, `expectedEndAt`, `pausedDurationSeconds`, and `lastPausedAt` in the database. The client recalculates remaining time every second from these timestamps, which means:

- **No drift** — `setInterval` is only used for UI updates, not tracking
- **Tab/sleep safe** — re-hydrates from server timestamps on tab focus
- **Server-validated** — the `/api/sessions/[id]/complete` endpoint computes actual focus seconds independently and caps at `planned + 5min` tolerance
- **Pause/resume accuracy** — accumulated pause duration is tracked server-side

---

## Database Schema

Key tables:
- `users` — user profiles + timer settings + streak cache
- `focus_sessions` — individual Pomodoro sessions with timestamps
- `daily_focus_aggregates` — pre-aggregated daily stats (upserted on completion)
- `rooms` — accountability rooms
- `room_memberships` — room membership + roles
- `room_invitations` — pending/accepted/declined invitations
- `notifications` — persistent in-app notifications

---

## Running Tests

```bash
# Unit tests (42 tests, ~1s)
npm test

# Unit tests with coverage
npm run test:coverage

# E2E tests (requires dev server or use webServer in playwright.config.ts)
npm run test:e2e
```

For E2E tests against a seeded database, set:
```env
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=password123
```
