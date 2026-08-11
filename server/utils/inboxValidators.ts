import { z } from 'zod'
import { dateSchema } from './validators'

export const captureInboxSchema = z.object({ content: z.string().trim().min(1).max(5000) })
export const updateInboxSchema = z.object({ content: z.string().trim().min(1).max(500) })
export const resolveInboxSchema = z
  .object({
    destination: z.enum(['task', 'today', 'sticky', 'project', 'goal']),
    projectId: z.string().uuid().nullable().optional(),
    assigneeId: z.string().uuid().nullable().optional(),
    dueDate: dateSchema.nullable().optional(),
    plannedDate: dateSchema.nullable().optional()
  })
  .refine((input) => input.destination !== 'today' || Boolean(input.plannedDate), {
    path: ['plannedDate'],
    message: 'Planned date is required for today'
  })
