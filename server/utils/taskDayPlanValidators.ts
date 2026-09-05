import { z } from 'zod'

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const time = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
  .nullable()

const editableFields = {
  plannedTime: time.optional(),
  plannedMinutes: z.number().int().min(1).max(1440).nullable().optional(),
  status: z.enum(['planned', 'completed', 'moved', 'skipped']).optional(),
  carryoverReason: z.string().trim().max(500).nullable().optional()
}

export const saveTaskDayPlanSchema = z.object({ plannedDate: date, ...editableFields })
export const updateTaskDayPlanSchema = z
  .object(editableFields)
  .partial()
  .refine((value) => Object.keys(value).length > 0)
