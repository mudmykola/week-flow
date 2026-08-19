import { sqliteTable, text, integer, index, primaryKey, uniqueIndex } from 'drizzle-orm/sqlite-core'
import type { DaySchedule } from '../../shared/types/daySchedule'

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  googleId: text('google_id').notNull().unique(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  avatarUrl: text('avatar_url'),
  role: text('role', { enum: ['user', 'pm', 'admin'] })
    .notNull()
    .default('user'),
  disabledAt: integer('disabled_at'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull()
})

export const projects = sqliteTable(
  'projects',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    color: text('color').notNull(),
    createdAt: integer('created_at').notNull(),
    ownerId: text('owner_id').references(() => users.id)
  },
  (table) => [index('projects_owner_id_idx').on(table.ownerId)]
)

export const tasks = sqliteTable(
  'tasks',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    note: text('note'),
    status: text('status', { enum: ['todo', 'in_progress', 'done'] })
      .notNull()
      .default('todo'),
    projectId: text('project_id').references(() => projects.id),
    week: text('week').notNull(),
    sort: integer('sort').notNull().default(0),
    createdAt: integer('created_at').notNull(),
    doneAt: integer('done_at'),
    ownerId: text('owner_id').references(() => users.id),
    assigneeId: text('assignee_id').references(() => users.id, { onDelete: 'set null' }),
    stageId: text('stage_id'),
    priority: text('priority', { enum: ['low', 'medium', 'high', 'urgent'] })
      .notNull()
      .default('medium'),
    dueDate: text('due_date'),
    plannedDate: text('planned_date'),
    plannedTime: text('planned_time'),
    estimateMinutes: integer('estimate_minutes'),
    dayRank: integer('day_rank'),
    weekRank: integer('week_rank'),
    blockedByTaskId: text('blocked_by_task_id'),
    tags: text('tags', { mode: 'json' }).$type<string[]>().notNull().default([]),
    recurrence: text('recurrence', { enum: ['daily', 'weekly', 'monthly'] }),
    archivedAt: integer('archived_at'),
    workState: text('work_state', { enum: ['active', 'waiting', 'review', 'deferred', 'cancelled'] })
      .notNull()
      .default('active'),
    waitingFor: text('waiting_for'),
    waitingUntil: text('waiting_until'),
    reviewerId: text('reviewer_id').references(() => users.id, { onDelete: 'set null' }),
    reviewNote: text('review_note'),
    reviewRequestedAt: integer('review_requested_at'),
    approvedAt: integer('approved_at'),
    actualMinutes: integer('actual_minutes'),
    carryoverReason: text('carryover_reason'),
    rescheduleCount: integer('reschedule_count').notNull().default(0),
    originalPlannedDate: text('original_planned_date'),
    readyCriteria: text('ready_criteria', { mode: 'json' }).$type<string[]>().notNull().default([]),
    doneCriteria: text('done_criteria', { mode: 'json' }).$type<string[]>().notNull().default([]),
    reminderAt: integer('reminder_at')
  },
  (table) => [
    index('tasks_week_idx').on(table.week),
    index('tasks_week_status_idx').on(table.week, table.status),
    index('tasks_project_id_idx').on(table.projectId),
    index('tasks_owner_id_idx').on(table.ownerId),
    index('tasks_owner_created_idx').on(table.ownerId, table.createdAt, table.id),
    index('tasks_owner_week_status_idx').on(table.ownerId, table.week, table.status),
    index('tasks_owner_planned_status_idx').on(table.ownerId, table.plannedDate, table.status),
    index('tasks_owner_reminder_idx').on(table.ownerId, table.reminderAt),
    index('tasks_assignee_id_idx').on(table.assigneeId),
    index('tasks_planned_date_idx').on(table.plannedDate, table.dayRank),
    index('tasks_work_state_idx').on(table.workState, table.waitingUntil),
    index('tasks_reviewer_idx').on(table.reviewerId, table.workState),
    index('tasks_reminder_idx').on(table.reminderAt)
  ]
)

export const reminderDeliveries = sqliteTable(
  'reminder_deliveries',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    taskId: text('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    scheduledAt: integer('scheduled_at').notNull(),
    deliveredAt: integer('delivered_at').notNull(),
    readAt: integer('read_at'),
    dismissedAt: integer('dismissed_at')
  },
  (table) => [
    uniqueIndex('reminder_delivery_task_schedule_idx').on(table.taskId, table.scheduledAt),
    index('reminder_delivery_owner_unread_idx').on(table.ownerId, table.readAt, table.deliveredAt)
  ]
)

export const workflowStages = sqliteTable(
  'workflow_stages',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    color: text('color').notNull(),
    category: text('category', { enum: ['todo', 'in_progress', 'done'] }).notNull(),
    position: integer('position').notNull().default(0),
    wipLimit: integer('wip_limit'),
    wipPolicy: text('wip_policy', { enum: ['warn', 'block'] })
      .notNull()
      .default('warn'),
    createdAt: integer('created_at').notNull()
  },
  (table) => [index('workflow_stages_project_idx').on(table.projectId, table.position)]
)

export const automationRules = sqliteTable(
  'automation_rules',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    trigger: text('trigger', { enum: ['task_created', 'status_changed'] }).notNull(),
    triggerValue: text('trigger_value'),
    action: text('action', { enum: ['set_priority', 'assign_user', 'add_tag'] }).notNull(),
    actionValue: text('action_value').notNull(),
    conditions: text('conditions', { mode: 'json' })
      .$type<Array<{ field: string; operator: string; value: string }>>()
      .notNull()
      .default([]),
    actions: text('actions', { mode: 'json' }).$type<Array<{ type: string; value: string }>>().notNull().default([]),
    enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
    createdAt: integer('created_at').notNull()
  },
  (table) => [index('automation_rules_project_idx').on(table.projectId)]
)

export const automationExecutions = sqliteTable(
  'automation_executions',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    ruleId: text('rule_id').references(() => automationRules.id, { onDelete: 'set null' }),
    taskId: text('task_id').references(() => tasks.id, { onDelete: 'set null' }),
    status: text('status', { enum: ['success', 'skipped', 'failed'] }).notNull(),
    trigger: text('trigger').notNull(),
    changes: text('changes', { mode: 'json' }).$type<Record<string, unknown>>().notNull().default({}),
    error: text('error'),
    createdAt: integer('created_at').notNull()
  },
  (table) => [index('automation_execution_owner_created_idx').on(table.ownerId, table.createdAt)]
)

export const subtasks = sqliteTable(
  'subtasks',
  {
    id: text('id').primaryKey(),
    taskId: text('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    note: text('note'),
    done: integer('done', { mode: 'boolean' }).notNull().default(false),
    status: text('status', { enum: ['todo', 'in_progress', 'done'] })
      .notNull()
      .default('todo'),
    priority: text('priority', { enum: ['low', 'medium', 'high', 'urgent'] })
      .notNull()
      .default('medium'),
    plannedDate: text('planned_date'),
    originalPlannedDate: text('original_planned_date'),
    rescheduleCount: integer('reschedule_count').notNull().default(0),
    dueDate: text('due_date'),
    assigneeId: text('assignee_id').references(() => users.id, { onDelete: 'set null' }),
    sort: integer('sort').notNull().default(0),
    createdAt: integer('created_at').notNull(),
    doneAt: integer('done_at')
  },
  (table) => [
    index('subtasks_task_id_idx').on(table.taskId),
    index('subtasks_assignee_id_idx').on(table.assigneeId),
    index('subtasks_planned_date_idx').on(table.plannedDate, table.status)
  ]
)

export const dailyReviews = sqliteTable(
  'daily_reviews',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    reviewDate: text('review_date').notNull(),
    content: text('content').notNull().default(''),
    structuredContent: text('structured_content', { mode: 'json' })
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    excludedTaskIds: text('excluded_task_ids', { mode: 'json' }).$type<string[]>().notNull().default([]),
    status: text('status', { enum: ['draft', 'submitted'] })
      .notNull()
      .default('draft'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
    submittedAt: integer('submitted_at')
  },
  (table) => [
    index('daily_reviews_owner_date_idx').on(table.ownerId, table.reviewDate),
    uniqueIndex('daily_reviews_user_date_idx').on(table.userId, table.reviewDate)
  ]
)

export const reviewProgressEntries = sqliteTable(
  'review_progress_entries',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    taskId: text('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    subtaskId: text('subtask_id').references(() => subtasks.id, { onDelete: 'set null' }),
    workDate: text('work_date').notNull(),
    kind: text('kind', { enum: ['progress', 'result', 'decision', 'blocker'] })
      .notNull()
      .default('progress'),
    note: text('note').notNull(),
    minutes: integer('minutes'),
    nextStep: text('next_step'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull()
  },
  (table) => [
    index('review_progress_owner_date_idx').on(table.ownerId, table.workDate),
    index('review_progress_task_date_idx').on(table.taskId, table.workDate)
  ]
)

export const comments = sqliteTable(
  'comments',
  {
    id: text('id').primaryKey(),
    taskId: text('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    authorId: text('author_id')
      .notNull()
      .references(() => users.id),
    body: text('body').notNull(),
    createdAt: integer('created_at').notNull()
  },
  (table) => [index('comments_task_id_idx').on(table.taskId)]
)

export const projectMembers = sqliteTable(
  'project_members',
  {
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role', { enum: ['owner', 'editor', 'viewer'] })
      .notNull()
      .default('viewer'),
    createdAt: integer('created_at').notNull()
  },
  (table) => [primaryKey({ columns: [table.projectId, table.userId] })]
)

export const invitations = sqliteTable(
  'invitations',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    role: text('role', { enum: ['editor', 'viewer'] })
      .notNull()
      .default('viewer'),
    token: text('token').notNull().unique(),
    invitedBy: text('invited_by')
      .notNull()
      .references(() => users.id),
    status: text('status', { enum: ['pending', 'accepted', 'revoked'] })
      .notNull()
      .default('pending'),
    expiresAt: integer('expires_at').notNull(),
    createdAt: integer('created_at').notNull()
  },
  (table) => [index('invitations_email_idx').on(table.email)]
)

export const activityLogs = sqliteTable(
  'activity_logs',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id),
    actorId: text('actor_id')
      .notNull()
      .references(() => users.id),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>().notNull().default({}),
    createdAt: integer('created_at').notNull()
  },
  (table) => [index('activity_owner_created_idx').on(table.ownerId, table.createdAt)]
)

export const focusSessions = sqliteTable(
  'focus_sessions',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    taskId: text('task_id').references(() => tasks.id, { onDelete: 'set null' }),
    kind: text('kind', { enum: ['focus', 'short_break', 'long_break'] })
      .notNull()
      .default('focus'),
    status: text('status', { enum: ['active', 'completed', 'interrupted'] })
      .notNull()
      .default('active'),
    plannedSeconds: integer('planned_seconds').notNull(),
    elapsedSeconds: integer('elapsed_seconds').notNull().default(0),
    note: text('note'),
    result: text('result'),
    startedAt: integer('started_at').notNull(),
    endedAt: integer('ended_at')
  },
  (table) => [
    index('focus_sessions_owner_started_idx').on(table.ownerId, table.startedAt),
    index('focus_sessions_owner_status_idx').on(table.ownerId, table.status)
  ]
)

export const savedViews = sqliteTable(
  'saved_views',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    filters: text('filters', { mode: 'json' }).$type<Record<string, unknown>>().notNull().default({}),
    createdAt: integer('created_at').notNull()
  },
  (table) => [index('saved_views_owner_idx').on(table.ownerId)]
)

export const inboxItems = sqliteTable(
  'inbox_items',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull()
  },
  (table) => [index('inbox_items_owner_created_idx').on(table.ownerId, table.createdAt)]
)

export const stickyNotes = sqliteTable(
  'sticky_notes',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    color: text('color', { enum: ['yellow', 'pink', 'blue', 'green'] })
      .notNull()
      .default('yellow'),
    positionX: integer('position_x').notNull().default(24),
    positionY: integer('position_y').notNull().default(24),
    checkedItems: text('checked_items', { mode: 'json' }).$type<number[]>().notNull().default([]),
    done: integer('done', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull()
  },
  (table) => [index('sticky_notes_owner_idx').on(table.ownerId, table.updatedAt)]
)

export const userSettings = sqliteTable('user_settings', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  theme: text('theme', { enum: ['system', 'light', 'dark'] })
    .notNull()
    .default('system'),
  locale: text('locale').notNull().default('uk'),
  weekStartsOn: integer('week_starts_on').notNull().default(1),
  notifications: integer('notifications', { mode: 'boolean' }).notNull().default(true),
  daySchedule: text('day_schedule', { mode: 'json' }).$type<DaySchedule>(),
  updatedAt: integer('updated_at').notNull()
})

export const teams = sqliteTable(
  'teams',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    managerId: text('manager_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at').notNull()
  },
  (table) => [index('teams_manager_idx').on(table.managerId)]
)

export const teamMembers = sqliteTable(
  'team_members',
  {
    teamId: text('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at').notNull()
  },
  (table) => [primaryKey({ columns: [table.teamId, table.userId] }), index('team_members_user_idx').on(table.userId)]
)

export const goals = sqliteTable(
  'goals',
  {
    id: text('id').primaryKey(),
    teamId: text('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    assigneeId: text('assignee_id').references(() => users.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    description: text('description'),
    priority: text('priority', { enum: ['low', 'medium', 'high'] })
      .notNull()
      .default('medium'),
    labels: text('labels', { mode: 'json' }).$type<string[]>().notNull().default([]),
    progress: integer('progress').notNull().default(0),
    status: text('status', { enum: ['active', 'done'] })
      .notNull()
      .default('active'),
    dueDate: text('due_date'),
    projectId: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
    createdBy: text('created_by')
      .notNull()
      .references(() => users.id),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull()
  },
  (table) => [index('goals_team_idx').on(table.teamId), index('goals_assignee_idx').on(table.assigneeId)]
)

export type Project = typeof projects.$inferSelect
export type NewProject = typeof projects.$inferInsert
export type Task = typeof tasks.$inferSelect
export type NewTask = typeof tasks.$inferInsert
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Team = typeof teams.$inferSelect
export type Goal = typeof goals.$inferSelect
export type StickyNote = typeof stickyNotes.$inferSelect
export type InboxItem = typeof inboxItems.$inferSelect
export type DailyReview = typeof dailyReviews.$inferSelect
export type ReviewProgressEntry = typeof reviewProgressEntries.$inferSelect
