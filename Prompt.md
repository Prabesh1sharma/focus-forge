# Build FocusForge — A Social Focus & Reading Tracker

Act as a senior full-stack engineer, product designer, and software architect. Build a production-quality web application called **FocusForge**, a social focus and reading tracker that helps users develop consistent reading and deep-work habits through Pomodoro sessions, accountability rooms, leaderboards, streaks, and activity heatmaps.

**Tagline:** Forge your focus. Build your streak.

Do not build just a static UI or prototype with hardcoded data. Build a complete, responsive application with real authentication, persistent database storage, functional APIs, working timers, room invitations, notifications, and live session statistics.

If the repository already contains code, inspect its structure and existing conventions before making changes. Preserve working functionality and integrate with the existing project rather than replacing it unnecessarily.

## 1. Technology Stack

Use the following stack:

- **Frontend:** Next.js App Router, React, TypeScript.
- **Styling:** Tailwind CSS and shadcn/ui.
- **Icons:** Lucide React.
- **Database:** Neon Serverless PostgreSQL.
- **ORM:** Drizzle ORM with schema migrations.
- **Authentication:** Auth.js or another well-maintained authentication solution compatible with Next.js and Neon.
- **Validation:** Zod.
- **Charts:** A lightweight charting library when necessary; implement the GitHub-style contribution heatmap with a custom component.
- **Notifications:** Persistent in-app notifications, with optional browser notifications.
- **Timer sound:** Browser audio APIs or a bundled audio asset.
- **Testing:** Vitest for unit tests and Playwright for important end-to-end flows.

Use Next.js Route Handlers and Server Actions where appropriate. Keep database access and privileged operations on the server. Do not introduce a separate backend framework.

Use environment variables for credentials and secrets. Include `.env.example` with placeholder values only.

## 2. Product Requirements

### A. Authentication and onboarding

Implement:

- Sign up with name, unique username, email, and password.
- Login and logout.
- Secure password handling if using password-based authentication.
- Appropriate session management and protected routes.
- A forgot-password flow if supported by the selected authentication provider.
- Username uniqueness validation.
- User profile editing, including display name, username, avatar, and short bio.
- A first-time onboarding flow that lets users select their primary goal: reading, studying, or deep work.
- A configurable daily focus goal, measured in minutes or hours.

After authentication, redirect users to the main Rooms dashboard rather than a generic landing page.

Never store plaintext passwords or expose authentication secrets.

### B. Main dashboard — Rooms

The default authenticated home page should be the **Rooms dashboard**.

The dashboard should include:

1. A personalized greeting.
2. Today's total completed focus time.
3. The current focus streak.
4. Today's progress toward the daily goal.
5. The user's active room, if any.
6. A list of joined rooms.
7. A room leaderboard.
8. Pending room invitations.
9. A prominent Start Focus Session action.
10. Quick access to personal statistics and the profile page.

Provide actions to create a room, join a room, and view room details.

If the user has not joined any rooms, show a useful empty state encouraging them to create a room or invite friends.

### C. Pomodoro focus timer

Build a fully functional Pomodoro timer.

Allow users to configure:

- Focus duration, default 25 minutes.
- Short break duration, default 5 minutes.
- Long break duration, default 15 minutes.
- Number of focus sessions before a long break, default 4.
- Automatic transition between focus and break sessions, optional.
- Timer completion sound and volume.
- Daily focus goal.
- Optional session label, such as Reading, Mathematics, Programming, or Research.

Timer controls:

- Start.
- Pause.
- Resume.
- Reset.
- Skip break.
- End session with confirmation.
- Start a new focus session.

Display a visually prominent countdown with a circular progress indicator. Clearly distinguish focus, short-break, and long-break modes.

Support keyboard shortcuts where practical and provide accessible controls.

#### Critical timer accuracy requirements

Do not implement the timer by simply decrementing a counter every second and relying on `setInterval` as the source of truth.

Instead:

- Store session start time, expected end time, accumulated paused duration, and current session status.
- Calculate remaining time from timestamps.
- Recalculate the countdown after browser tab visibility changes, page refreshes, and returning to the application.
- Persist active session state so a refresh does not accidentally reset the session.
- Ensure that paused time does not count toward focused time.
- Prevent duplicate session completion or duplicate statistics when multiple events fire.
- Use server-side timestamps and validated session transitions where appropriate.

When a focus session finishes:

1. Mark the focus session as completed.
2. Save the actual eligible focus duration.
3. Update the user's daily focus statistics.
4. Update room leaderboard totals.
5. Refresh the profile heatmap data.
6. Display a completion celebration.
7. Play the configured completion sound.
8. Show a notification if browser permissions allow it.
9. Offer the configured break or another focus session.

If sound playback is blocked by the browser, show a fallback notification or visual alert. Request any necessary browser permission appropriately.

If the application is closed before completion, do not silently award a full completed session. Reconcile persisted timestamps and session status when the user returns.

Do not count break time, paused time, abandoned sessions, or incomplete sessions as completed focus time.

### D. Focus statistics and reading history

Record every focus session with:

- User ID.
- Optional room ID.
- Session type.
- Optional session label.
- Start timestamp.
- End timestamp.
- Accumulated paused duration.
- Actual eligible focus duration.
- Completion status.
- Creation timestamp.

Provide a personal statistics page showing:

- Total lifetime focus time.
- Today's completed focus time.
- This week's and this month's totals.
- Daily average.
- Number of completed sessions.
- Longest focus session.
- Current and longest streak.
- Daily and weekly goal completion.
- Recent session history.

Store timestamps consistently, preferably in UTC, and calculate daily statistics using the user's configured timezone.

Only count completed, eligible focus time. Define how interrupted sessions are handled and keep the same rule across statistics, heatmaps, and leaderboards.

### E. GitHub-style activity heatmap

Build a contribution graph similar to GitHub's activity calendar.

Display it prominently on the user's profile page.

Requirements:

- Show the previous 365 days of activity.
- Each cell represents one local calendar day.
- Use five intensity levels: no activity and four levels based on focused minutes.
- Display a tooltip with the date, total focus duration, and number of completed sessions.
- Include month labels and weekday labels.
- Provide an accessible legend.
- Update the heatmap when a session is completed.
- Show empty days accurately.
- Support responsive layouts without making cells unusably small.

Use a configurable intensity scale based on daily focused minutes or progress toward the user's daily goal. Make the chosen thresholds consistent and document them.

The heatmap must be calculated from persistent session data or a reliable aggregated statistics table, never from temporary frontend state.

### F. Rooms and social accountability

Users should be able to create and participate in focus rooms.

Each room should support:

- Unique room name.
- Description.
- Room avatar or color.
- Room creator and members.
- Public or private visibility.
- Creation date.
- Room-level leaderboard.
- Member focus statistics.
- Room-specific session history.
- Member management and room settings.
- Room invitation management.

Private rooms should only be accessible to authorized members and invited users.

A user can belong to multiple rooms. A focus session can optionally be associated with one room. Do not duplicate the same focused minutes across multiple rooms unless the product explicitly supports that behavior.

The room page should have these sections:

1. Overview.
2. Leaderboard.
3. Members.
4. Activity.
5. Settings, for authorized users.

Allow users to leave rooms. Room creators or authorized admins should be able to remove members and manage invitations.

### G. Invite users by username

Implement a real invitation workflow.

Room owners or authorized members can invite another registered user using their unique username.

Workflow:

1. Search for a user by username.
2. Display matching users without exposing private account information.
3. Select a user and send an invitation.
4. Create a persistent invitation record.
5. Create an in-app notification for the recipient.
6. Display the invitation in the recipient's Notifications section.
7. Allow the recipient to accept or decline.
8. On acceptance, create the room membership transactionally.
9. Update the invitation status and notify the inviter.
10. Prevent duplicate pending invitations and duplicate memberships.

Only authorized users should be allowed to invite others.

Do not rely on a frontend-only invitation or membership state.

### H. Notifications

Build a dedicated Notifications page or panel.

Support notifications for:

- Room invitations.
- Accepted or declined invitations.
- Room membership changes.
- Relevant room announcements, if implemented.
- Focus session completion or goal achievement, where appropriate.

Each notification should include:

- Notification type.
- Relevant room or user reference.
- Message.
- Read/unread status.
- Creation timestamp.
- Optional navigation destination.

Include:

- Unread count in the navigation.
- Mark-as-read action.
- Mark-all-as-read action.
- Appropriate empty states.
- Pagination or incremental loading when necessary.

Notifications must persist in the database and be scoped to the authenticated recipient.

Real-time updates are optional for the first release. If implemented, use a suitable solution rather than unnecessary polling.

### I. Room leaderboard

Each room should display a leaderboard with:

- Rank.
- Avatar and username.
- Focused time.
- Completed focus sessions.
- Daily and weekly activity.
- Optional current streak.

Allow users to switch between:

- Today.
- This week.
- This month.
- All time.

Use a clearly defined timezone for daily and weekly boundaries. Use server-side database queries for leaderboard calculations.

Sort by eligible focused time for the selected period. Apply deterministic tie-breaking and do not allow users to manipulate rankings by editing client-side values.

Refresh the leaderboard after a completed focus session.

Clearly distinguish a user's personal lifetime statistics from room-specific statistics.

### J. User profile

Build a polished public-facing profile for each user, subject to privacy settings.

Include:

- Avatar.
- Display name and username.
- Bio.
- Member-since date.
- Total focus time.
- Current streak and longest streak.
- Completed focus sessions.
- Daily goal.
- GitHub-style heatmap.
- Recent activity, if permitted.

Let users control whether their profile is public and whether they appear in public discovery or search.

Keep private room data and private account details protected.

## 3. Visual Design and User Experience

Create a modern, motivating, premium productivity interface.

The application should feel like a combination of a focused study workspace and a friendly community.

### Design direction

- Dark theme as the default.
- Deep charcoal or midnight background.
- Emerald or lime green as the primary accent, associated with growth and progress.
- Muted secondary text for readability.
- Subtle gradients, soft borders, and restrained shadows.
- Clean typography and generous spacing.
- Rounded cards and consistent component styling.
- Smooth, purposeful transitions.
- Minimal visual distractions during focus sessions.

Avoid excessive gradients, excessive glassmorphism, bright colors everywhere, and unnecessary animations.

The timer should be the primary visual element during an active focus session.

Use celebratory animation sparingly, especially when completing sessions, reaching daily goals, or maintaining a streak.

Provide a light theme if practical, while ensuring the dark theme is complete and polished.

### Navigation

Desktop sidebar:

- Rooms.
- Focus.
- Statistics.
- Notifications.
- Profile.
- Settings.

Include the current user's avatar and account menu.

On mobile, use a compact bottom navigation or an appropriate mobile navigation pattern.

The design must be responsive, keyboard accessible, and usable on desktop, tablet, and mobile devices.

### Important UI states

Implement meaningful states for:

- Loading.
- Empty data.
- Form validation.
- Failed requests.
- Network interruption.
- Expired authentication.
- No room memberships.
- No notifications.
- Pending invitations.
- Active, paused, completed, and abandoned sessions.
- Successful session completion.

Never leave buttons that appear functional but do nothing.

## 4. Database Schema

Design a normalized PostgreSQL schema using Drizzle ORM.

Include appropriate tables for:

- Users.
- Authentication accounts and sessions, according to the selected authentication provider.
- User preferences.
- Rooms.
- Room memberships.
- Room invitations.
- Focus sessions.
- Daily focus aggregates, if useful.
- Notifications.

Suggested fields:

**Users**
- id.
- username, unique.
- displayName.
- email, unique.
- avatarUrl.
- bio.
- timezone.
- dailyGoalMinutes.
- profileVisibility.
- createdAt.
- updatedAt.

**Rooms**
- id.
- name.
- slug, unique.
- description.
- avatar or theme color.
- visibility.
- createdBy.
- createdAt.
- updatedAt.

**RoomMemberships**
- id.
- roomId.
- userId.
- role.
- joinedAt.

Enforce a unique constraint on `(roomId, userId)`.

**RoomInvitations**
- id.
- roomId.
- inviterId.
- inviteeId.
- status.
- createdAt.
- respondedAt.

**FocusSessions**
- id.
- userId.
- roomId, nullable.
- sessionType.
- label, nullable.
- startedAt.
- endedAt, nullable.
- pausedDurationSeconds.
- status.
- actualFocusSeconds.
- createdAt.
- updatedAt.

**Notifications**
- id.
- recipientId.
- actorId, nullable.
- type.
- title.
- message.
- relatedEntityType, nullable.
- relatedEntityId, nullable.
- readAt, nullable.
- createdAt.

Adjust field types and names as appropriate.

Add database indexes for frequent queries, including usernames, room memberships, invitation statuses, session timestamps, and notification retrieval.

Add appropriate foreign keys, deletion rules, unique constraints, and validation.

For invitation acceptance and other multi-record operations, use database transactions.

If daily aggregates are introduced, define how they are updated and reconciled so that statistics cannot drift from source session records.

## 5. Application Architecture

Use a maintainable, feature-oriented structure.

Separate:

- UI components.
- Application pages and layouts.
- Server-side business logic.
- Database queries.
- Authentication and authorization.
- Input validation.
- Shared types.
- Reusable utilities.
- Tests.

Keep database queries out of presentation components.

Use Server Components for read-heavy pages where appropriate and Client Components for interactive elements such as timers, forms, dropdowns, and live UI updates.

Use Route Handlers for suitable API endpoints and Server Actions for appropriate form-based mutations.

Every mutation must validate the input on the server and authenticate the user.

Enforce authorization on the server, not merely by hiding UI elements.

Never expose database credentials, privileged environment variables, or private user information to the browser.

## 6. API and Business Logic

Implement the necessary API endpoints or Server Actions for:

- Registration, login, and account management.
- User search by username.
- Profile updates.
- Room creation and editing.
- Room membership and leaving.
- Sending, accepting, and declining invitations.
- Notification retrieval and read status.
- Starting, pausing, resuming, completing, and abandoning focus sessions.
- Personal statistics and heatmap retrieval.
- Room leaderboards and activity.

Follow consistent validation and error-handling conventions.

Use appropriate HTTP status codes for Route Handlers.

Make session completion and invitation acceptance safe against duplicate submissions. Validate state transitions on the server and use transactions or idempotency mechanisms where appropriate.

Prevent users from completing or modifying another user's focus sessions.

Protect against unauthorized room access, insecure direct object references, spam invitations, and username enumeration where appropriate.

Do not trust client-supplied focus duration as authoritative. Validate session timing against server-observed state and persisted timestamps. Handle clock differences and offline interruptions explicitly.

## 7. Performance and Reliability

- Add pagination or bounded queries for large histories and notification lists.
- Use database indexes appropriately.
- Avoid unnecessary client-side fetching.
- Avoid N+1 database queries.
- Use optimistic updates only where rollback is supported.
- Provide useful error messages without exposing sensitive implementation details.
- Keep dependencies minimal.
- Ensure that refreshing the page does not lose valid session state.
- Ensure that simultaneous requests do not create duplicate memberships or award the same session twice.
- Provide a database migration workflow.
- Avoid storing a full per-second timer history.

## 8. Testing Requirements

Write tests for the critical business logic.

At minimum, test:

1. Registration and login.
2. Protected routes.
3. Unique usernames.
4. Creating a room.
5. Sending a room invitation.
6. Accepting and declining invitations.
7. Preventing duplicate invitations and memberships.
8. Starting and pausing a focus session.
9. Excluding paused time from focus totals.
10. Completing a session exactly once.
11. Updating daily statistics and the heatmap.
12. Calculating leaderboards for different time ranges.
13. Calculating streaks across timezone and date boundaries.
14. Enforcing room authorization.
15. Handling refreshes and returning to an active timer.

Test important failure scenarios, not just the successful path.

## 9. Development Workflow

Work in the following order:

**Phase 1 — Foundation**
- Inspect the repository.
- Set up Next.js, TypeScript, styling, and shared UI.
- Configure Neon and Drizzle.
- Create migrations.
- Implement authentication and protected routes.

**Phase 2 — Core Focus**
- Implement timer settings.
- Build the timer engine.
- Persist session state.
- Add sound and completion handling.
- Add personal focus statistics.

**Phase 3 — Social Features**
- Build room creation and membership.
- Implement username search and invitations.
- Implement persistent notifications.
- Add room leaderboards and room activity.

**Phase 4 — Profile and Motivation**
- Implement the profile page.
- Build the 365-day activity heatmap.
- Add streaks, daily goals, and progress visualizations.
- Refine empty states and completion celebrations.

**Phase 5 — Quality**
- Add automated tests.
- Verify authorization and database constraints.
- Test responsive behavior.
- Test timer accuracy and recovery.
- Add setup and deployment documentation.

After each phase, verify the application works before moving to the next.

## 10. Definition of Done

The application is complete only when:

- A new user can register and log in.
- The user can configure focus and break durations.
- The timer starts, pauses, resumes, and completes correctly.
- Completed focus time is saved in Neon and survives refreshes.
- Timer completion triggers the configured sound when browser policies permit it.
- The user's daily statistics and activity heatmap update correctly.
- The user can create a room and invite another registered user by username.
- The recipient sees the invitation in Notifications and can accept or decline it.
- Accepted invitations create valid room memberships.
- Room leaderboards show correct totals for each supported period.
- Users cannot access private rooms or modify data without permission.
- The application is responsive and accessible.
- Database migrations and setup instructions are provided.
- No core feature relies on hardcoded mock data.

## 11. Final Instructions to the Coding Agent

Start by inspecting the repository and explaining the implementation plan briefly. Then implement the application in working, testable increments.

Do not stop after generating a design, a plan, a schema, or a landing page. Continue until the core application is functional.

Make sensible product decisions without repeatedly asking for approval. If a required external service needs credentials, implement the integration and document the required environment variables.

Do not invent environment credentials, silently ignore errors, or claim that untested features are complete.

Prioritize correctness of timer accounting, data integrity, authorization, and the invitation workflow over decorative polish.

At the end, provide:
- A concise summary of implemented features.
- The project structure.
- Required environment variables.
- Database migration and development commands.
- Test commands and test results.
- Any incomplete features or external setup steps.

Build FocusForge as a real, maintainable product that can be developed further and deployed to production.