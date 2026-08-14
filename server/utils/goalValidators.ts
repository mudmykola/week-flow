import { z } from 'zod'

export const goalPatchSchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  assigneeId: z.string().nullable().optional(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  labels: z.array(z.string().trim().min(1).max(40)).max(8).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  status: z.enum(['active', 'done']).optional(),
  projectId: z.string().nullable().optional()
})

export const goalBulkSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  patch: goalPatchSchema
    .pick({ assigneeId: true, dueDate: true, priority: true, status: true })
    .refine((patch) => Object.keys(patch).length > 0)
})
