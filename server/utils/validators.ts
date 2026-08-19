import { z } from 'zod'

export const taskStatusSchema = z.enum(['todo', 'in_progress', 'done'])
export const taskPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent'])
export const taskRecurrenceSchema = z.enum(['daily', 'weekly', 'monthly'])
export const taskWorkStateSchema = z.enum(['active', 'waiting', 'review', 'deferred', 'cancelled'])
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
export const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)

export const weekSchema = z.string().regex(/^\d{4}-W\d{2}$/, 'Expected format YYYY-Www')

export const taskListQuerySchema = z.object({
  cursor: z.string().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().trim().max(120).optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  assignee: z.string().uuid().optional()
})

export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  note: z.string().max(2000).nullable().optional(),
  status: taskStatusSchema.optional().default('todo'),
  projectId: z.string().uuid().nullable().optional(),
  week: weekSchema,
  sort: z.number().int().optional().default(0),
  priority: taskPrioritySchema.optional().default('medium'),
  dueDate: dateSchema.nullable().optional(),
  plannedDate: dateSchema.nullable().optional(),
  plannedTime: timeSchema.nullable().optional(),
  estimateMinutes: z.number().int().min(5).max(1440).nullable().optional(),
  dayRank: z.number().int().min(1).max(3).nullable().optional(),
  weekRank: z.number().int().min(1).max(3).nullable().optional(),
  blockedByTaskId: z.string().uuid().nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).optional().default([]),
  recurrence: taskRecurrenceSchema.nullable().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  stageId: z.string().uuid().nullable().optional(),
  workState: taskWorkStateSchema.optional().default('active'),
  waitingFor: z.string().trim().max(500).nullable().optional(),
  waitingUntil: dateSchema.nullable().optional(),
  reviewerId: z.string().uuid().nullable().optional(),
  reviewNote: z.string().max(2000).nullable().optional(),
  actualMinutes: z.number().int().min(0).max(100_000).nullable().optional(),
  carryoverReason: z.string().max(500).nullable().optional(),
  readyCriteria: z.array(z.string().trim().min(1).max(200)).max(30).optional().default([]),
  doneCriteria: z.array(z.string().trim().min(1).max(200)).max(30).optional().default([]),
  reminderAt: z.number().int().nullable().optional()
})

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  note: z.string().max(2000).nullable().optional(),
  status: taskStatusSchema.optional(),
  projectId: z.string().uuid().nullable().optional(),
  week: weekSchema.optional(),
  sort: z.number().int().optional(),
  priority: taskPrioritySchema.optional(),
  dueDate: dateSchema.nullable().optional(),
  plannedDate: dateSchema.nullable().optional(),
  plannedTime: timeSchema.nullable().optional(),
  estimateMinutes: z.number().int().min(5).max(1440).nullable().optional(),
  dayRank: z.number().int().min(1).max(3).nullable().optional(),
  weekRank: z.number().int().min(1).max(3).nullable().optional(),
  blockedByTaskId: z.string().uuid().nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).optional(),
  recurrence: taskRecurrenceSchema.nullable().optional(),
  archivedAt: z.number().int().nullable().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  stageId: z.string().uuid().nullable().optional(),
  workState: taskWorkStateSchema.optional(),
  waitingFor: z.string().trim().max(500).nullable().optional(),
  waitingUntil: dateSchema.nullable().optional(),
  reviewerId: z.string().uuid().nullable().optional(),
  reviewNote: z.string().max(2000).nullable().optional(),
  actualMinutes: z.number().int().min(0).max(100_000).nullable().optional(),
  carryoverReason: z.string().max(500).nullable().optional(),
  readyCriteria: z.array(z.string().trim().min(1).max(200)).max(30).optional(),
  doneCriteria: z.array(z.string().trim().min(1).max(200)).max(30).optional(),
  reminderAt: z.number().int().nullable().optional()
})

export const bulkTaskSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  patch: updateTaskSchema
    .pick({
      status: true,
      projectId: true,
      week: true,
      priority: true,
      dueDate: true,
      plannedDate: true,
      plannedTime: true,
      estimateMinutes: true,
      dayRank: true,
      weekRank: true,
      blockedByTaskId: true,
      assigneeId: true,
      archivedAt: true,
      workState: true,
      waitingUntil: true,
      reviewerId: true,
      reminderAt: true
    })
    .strict()
})

export const createSubtaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  note: z.string().max(2000).nullable().optional(),
  status: taskStatusSchema.optional().default('todo'),
  priority: taskPrioritySchema.optional().default('medium'),
  plannedDate: dateSchema.nullable().optional(),
  dueDate: dateSchema.nullable().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  sort: z.number().int().min(0).optional()
})
export const updateSubtaskSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  note: z.string().max(2000).nullable().optional(),
  done: z.boolean().optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  plannedDate: dateSchema.nullable().optional(),
  dueDate: dateSchema.nullable().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  sort: z.number().int().min(0).optional()
})
export const bulkSubtaskSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  patch: updateSubtaskSchema.pick({ done: true, status: true }).strict()
})
export const createCommentSchema = z.object({ body: z.string().trim().min(1).max(2000) })
export const createInvitationSchema = z.object({
  email: z.string().email(),
  role: z.enum(['editor', 'viewer']).default('viewer')
})
export const updateSettingsSchema = z.object({
  theme: z.enum(['system', 'light', 'dark']).optional(),
  locale: z.enum(['uk', 'en']).optional(),
  weekStartsOn: z.number().int().min(0).max(6).optional(),
  notifications: z.boolean().optional(),
  daySchedule: z
    .object({
      workStart: timeSchema,
      morningEnd: timeSchema,
      middayEnd: timeSchema,
      workEnd: timeSchema,
      lunchStart: timeSchema,
      lunchMinutes: z.number().int().min(15).max(180)
    })
    .refine(
      (value) =>
        value.workStart < value.morningEnd && value.morningEnd < value.middayEnd && value.middayEnd < value.workEnd,
      'Time zone boundaries must be ordered'
    )
    .optional()
})

export const saveDailyReviewSchema = z.object({
  reviewDate: dateSchema,
  content: z.string().max(20_000),
  structuredContent: z.record(z.string(), z.unknown()).optional().default({}),
  excludedTaskIds: z.array(z.string().uuid()).max(500).optional().default([]),
  status: z.enum(['draft', 'submitted']).optional().default('draft')
})

export const moveWeekSchema = z.object({
  fromWeek: weekSchema,
  toWeek: weekSchema
})

export const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Expected hex color')
})

export const stickyNoteColorSchema = z.enum(['yellow', 'pink', 'blue', 'green'])
export const createStickyNoteSchema = z.object({
  content: z.string().trim().min(1).max(1000),
  color: stickyNoteColorSchema.optional().default('yellow'),
  positionX: z.number().int().min(0).max(4000).optional().default(24),
  positionY: z.number().int().min(0).max(4000).optional().default(24)
})
export const updateStickyNoteSchema = z
  .object({
    content: z.string().trim().min(1).max(1000).optional(),
    color: stickyNoteColorSchema.optional(),
    positionX: z.number().int().min(0).max(4000).optional(),
    positionY: z.number().int().min(0).max(4000).optional(),
    checkedItems: z.array(z.number().int().min(0).max(99)).max(100).optional(),
    done: z.boolean().optional()
  })
  .refine((value) => Object.keys(value).length > 0)

export const focusKindSchema = z.enum(['focus', 'short_break', 'long_break'])
export const createFocusSessionSchema = z.object({
  taskId: z.string().uuid().nullable().optional(),
  kind: focusKindSchema,
  plannedSeconds: z.number().int().min(60).max(14_400),
  note: z.string().max(1000).nullable().optional()
})
export const updateFocusSessionSchema = z.object({
  status: z.enum(['active', 'completed', 'interrupted']).optional(),
  elapsedSeconds: z.number().int().min(0).max(14_400).optional(),
  note: z.string().max(1000).nullable().optional(),
  result: z.string().max(1000).nullable().optional()
})

export type CreateTaskInput = z.infer<typeof createTaskSchema>
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>
export type MoveWeekInput = z.infer<typeof moveWeekSchema>
export type CreateProjectInput = z.infer<typeof createProjectSchema>
