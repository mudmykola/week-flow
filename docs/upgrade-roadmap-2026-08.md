# WeekFlow upgrade research — 2026-08

## Current state

WeekFlow is a client-rendered Nuxt 4 workspace on Cloudflare Workers and D1. It has Google OAuth, per-account tasks/projects/settings/sticky notes, team roles, project workflows, automations, goals, analytics, calendar/timeline/focus/review views, PWA packaging, Ukrainian/English localization and a gated CI deployment pipeline.

The repository currently contains 21 product routes, 43 API handlers, 16 D1 tables and 49 automated tests. The application is feature-rich enough that reliability, information architecture and daily workflow cohesion now have higher value than adding isolated pages.

## Main findings

### Product and UX

1. Navigation has 18–20 primary destinations. Important daily actions compete with admin, archive, analytics and configuration. Introduce grouped navigation and a compact daily command center.
2. Today, Focus, Inbox, Calendar, Review and Sticky Notes work independently. A unified daily workflow should connect capture → plan → focus → review.
3. Settings exposes notifications, but there is no reminder engine, scheduled delivery or notification permission flow.
4. Task creation is flexible, but Calendar lacks direct date-cell creation and drag rescheduling. Sticky checklist items cannot yet be promoted to tasks.
5. Team management shows goals/progress but lacks workload planning, member detail drill-down and a transparent permission matrix.

### Architecture and maintainability

1. `TaskEditor.vue` (450 lines), the board page (415), `AppShell.vue` and Notes (333 each) are becoming orchestration hotspots. Extract feature composables and focused subcomponents before adding more behavior.
2. API access is repository-based but error handling, optimistic rollback, retry and toast messaging are not centralized.
3. Multiple views fetch all tasks and filter in the browser. This will degrade as account data grows.
4. Activity, export and analytics do not yet cover all newer entities consistently, including sticky notes and some team/workflow changes.

### Data and performance

1. Add cursor pagination to task/activity/admin endpoints and server-side filters for date, status, assignee and search.
2. Review D1 query plans for the most common combined predicates and add only measured composite/partial indexes.
3. The current PWA caches the shell, but there is no offline mutation queue or conflict strategy. “Offline” is currently informational rather than functional.
4. D1 migrations run automatically, but the pipeline does not capture a pre-migration Time Travel bookmark or perform a post-migration API smoke test.

### Security and operations

1. Add rate limits for OAuth-sensitive and write-heavy endpoints, especially invitations, task creation and note mutations.
2. Add structured request/error logs, correlation IDs and production alerts. There is currently no application-level observability.
3. Add account data deletion and expand JSON export to projects, tasks, notes, settings, goals and memberships.
4. Replace the hardcoded administrator email with environment-based bootstrap configuration and document role recovery.

### Testing and DX

1. Component/domain tests are healthy, but there are no authenticated browser E2E flows and no D1-backed API integration suite.
2. Add Playwright smoke coverage for login callback handling, task CRUD, calendar creation, project creation, sticky checklist persistence and role restrictions.
3. Add Miniflare/D1 integration tests for ownership isolation, migrations and authorization edge cases.
4. Dependencies are current except TypeScript 7; defer that major upgrade until Nuxt/Vue tooling officially supports it in this project.

## Prioritized backlog

### Urgent / High

| Area       | Task                                          | Outcome                                                                               | Labels                  |
| ---------- | --------------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------- |
| Core       | Reliability foundation                        | Central API errors, retry/rollback, request IDs and user-safe error states            | core, Improvement       |
| DX         | Authenticated E2E and D1 integration suite    | Protect the main workflows and ownership boundaries before further expansion          | Refactor, backend       |
| Deployment | Production observability and migration safety | Workers Logs, alerts, Time Travel bookmark, API smoke and rollback runbook            | Deployment, Improvement |
| Product    | Daily command center                          | Unify Today, Inbox, Focus, due tasks and daily sticky items into one operational view | Feature, ui/ux          |
| Product    | Reminder engine                               | In-app/browser reminders backed by scheduled Workers and user preferences             | Feature, backend        |

### Medium

| Area        | Task                                  | Outcome                                                                        | Labels                |
| ----------- | ------------------------------------- | ------------------------------------------------------------------------------ | --------------------- |
| Frontend    | Calendar direct manipulation          | Create on a day, drag to reschedule and open task details without route loss   | frontend, Improvement |
| Performance | Server query and pagination layer     | Stop fetching all tasks; add cursor pagination, search and measured indexes    | Performance, api      |
| Core        | Split orchestration hotspots          | Break TaskEditor, AppShell, board and Notes into composables and subcomponents | Refactor, core        |
| Data        | Complete export and account lifecycle | Export every owned entity and support safe account deletion                    | backend, Feature      |
| PWA         | Offline mutation queue                | Create/edit tasks and notes offline with sync status and conflict resolution   | Feature, Performance  |
| Team        | Workload and member drill-down        | Capacity, overdue risk, goal/task detail and explicit role capabilities        | Feature, ui/ux        |

### Low / Later

| Area          | Task                                  | Outcome                                                                  | Labels          |
| ------------- | ------------------------------------- | ------------------------------------------------------------------------ | --------------- |
| UI/UX         | Navigation information architecture   | Group daily, planning, insights and administration destinations          | UI, Improvement |
| Accessibility | Keyboard and screen-reader completion | Full dialogs, board drag alternatives and automated accessibility checks | UI, Improvement |
| Core          | TypeScript 7 migration                | Upgrade only after ecosystem compatibility is confirmed                  | Refactor, core  |

## Recommended sequence

1. Reliability foundation + production observability.
2. Authenticated E2E and D1 integration tests.
3. Daily command center.
4. Reminder engine.
5. Calendar direct manipulation.
6. Pagination/query optimization and offline queue.

The recommended next epic is **Reliability foundation**, because every later product feature will otherwise add more duplicated loading, mutation and error behavior.
