import { sqliteTable, text, integer, index, primaryKey } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  googleId: text('google_id').notNull().unique(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  avatarUrl: text('avatar_url'),
  role: text('role', { enum: ['user', 'admin'] }).notNull().default('user'),
  disabledAt: integer('disabled_at'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull()
})

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  color: text('color').notNull(),
  createdAt: integer('created_at').notNull(),
  ownerId: text('owner_id').references(() => users.id)
}, table => [index('projects_owner_id_idx').on(table.ownerId)])

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  note: text('note'),
  status: text('status', { enum: ['todo', 'in_progress', 'done'] }).notNull().default('todo'),
  projectId: text('project_id').references(() => projects.id),
  week: text('week').notNull(),
  sort: integer('sort').notNull().default(0),
  createdAt: integer('created_at').notNull(),
  doneAt: integer('done_at'),
  ownerId: text('owner_id').references(() => users.id),
  priority: text('priority', { enum: ['low', 'medium', 'high', 'urgent'] }).notNull().default('medium'),
  dueDate: text('due_date'),
  tags: text('tags', { mode: 'json' }).$type<string[]>().notNull().default([]),
  recurrence: text('recurrence', { enum: ['daily', 'weekly', 'monthly'] }),
  archivedAt: integer('archived_at')
}, (table) => [
  index('tasks_week_idx').on(table.week),
  index('tasks_week_status_idx').on(table.week, table.status),
  index('tasks_project_id_idx').on(table.projectId),
  index('tasks_owner_id_idx').on(table.ownerId)
])

export const subtasks = sqliteTable('subtasks', {
  id: text('id').primaryKey(),
  taskId: text('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  done: integer('done', { mode: 'boolean' }).notNull().default(false),
  sort: integer('sort').notNull().default(0),
  createdAt: integer('created_at').notNull()
}, table => [index('subtasks_task_id_idx').on(table.taskId)])

export const comments = sqliteTable('comments', {
  id: text('id').primaryKey(),
  taskId: text('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  authorId: text('author_id').notNull().references(() => users.id),
  body: text('body').notNull(),
  createdAt: integer('created_at').notNull()
}, table => [index('comments_task_id_idx').on(table.taskId)])

export const projectMembers = sqliteTable('project_members', {
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['owner', 'editor', 'viewer'] }).notNull().default('viewer'),
  createdAt: integer('created_at').notNull()
}, table => [primaryKey({ columns: [table.projectId, table.userId] })])

export const invitations = sqliteTable('invitations', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  role: text('role', { enum: ['editor', 'viewer'] }).notNull().default('viewer'),
  token: text('token').notNull().unique(),
  invitedBy: text('invited_by').notNull().references(() => users.id),
  status: text('status', { enum: ['pending', 'accepted', 'revoked'] }).notNull().default('pending'),
  expiresAt: integer('expires_at').notNull(),
  createdAt: integer('created_at').notNull()
}, table => [index('invitations_email_idx').on(table.email)])

export const activityLogs = sqliteTable('activity_logs', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull().references(() => users.id),
  actorId: text('actor_id').notNull().references(() => users.id),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>().notNull().default({}),
  createdAt: integer('created_at').notNull()
}, table => [index('activity_owner_created_idx').on(table.ownerId, table.createdAt)])

export const savedViews = sqliteTable('saved_views', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  filters: text('filters', { mode: 'json' }).$type<Record<string, unknown>>().notNull().default({}),
  createdAt: integer('created_at').notNull()
}, table => [index('saved_views_owner_idx').on(table.ownerId)])

export const userSettings = sqliteTable('user_settings', {
  userId: text('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  theme: text('theme', { enum: ['system', 'light', 'dark'] }).notNull().default('system'),
  locale: text('locale').notNull().default('uk'),
  weekStartsOn: integer('week_starts_on').notNull().default(1),
  notifications: integer('notifications', { mode: 'boolean' }).notNull().default(true),
  updatedAt: integer('updated_at').notNull()
})

export type Project = typeof projects.$inferSelect
export type NewProject = typeof projects.$inferInsert
export type Task = typeof tasks.$inferSelect
export type NewTask = typeof tasks.$inferInsert
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
