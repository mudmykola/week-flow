import { z } from 'zod'

export const taskStatusSchema = z.enum(['todo', 'in_progress', 'done'])
export const taskPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent'])
export const taskRecurrenceSchema = z.enum(['daily', 'weekly', 'monthly'])
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const weekSchema = z.string().regex(/^\d{4}-W\d{2}$/, 'Expected format YYYY-Www')

export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  note: z.string().max(2000).nullable().optional(),
  status: taskStatusSchema.optional().default('todo'),
  projectId: z.string().uuid().nullable().optional(),
  week: weekSchema,
  sort: z.number().int().optional().default(0),
  priority: taskPrioritySchema.optional().default('medium'),
  dueDate: dateSchema.nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).optional().default([]),
  recurrence: taskRecurrenceSchema.nullable().optional()
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
  tags: z.array(z.string().trim().min(1).max(30)).max(10).optional(),
  recurrence: taskRecurrenceSchema.nullable().optional(),
  archivedAt: z.number().int().nullable().optional()
})

export const createSubtaskSchema = z.object({ title: z.string().trim().min(1).max(200) })
export const updateSubtaskSchema = z.object({ title: z.string().trim().min(1).max(200).optional(), done: z.boolean().optional() })
export const createCommentSchema = z.object({ body: z.string().trim().min(1).max(2000) })
export const createInvitationSchema = z.object({ email: z.string().email(), role: z.enum(['editor', 'viewer']).default('viewer') })
export const updateSettingsSchema = z.object({
  theme: z.enum(['system', 'light', 'dark']).optional(),
  locale: z.enum(['uk', 'en']).optional(),
  weekStartsOn: z.number().int().min(0).max(6).optional(),
  notifications: z.boolean().optional()
})

export const moveWeekSchema = z.object({
  fromWeek: weekSchema,
  toWeek: weekSchema
})

export const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Expected hex color')
})

export type CreateTaskInput = z.infer<typeof createTaskSchema>
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>
export type MoveWeekInput = z.infer<typeof moveWeekSchema>
export type CreateProjectInput = z.infer<typeof createProjectSchema>
