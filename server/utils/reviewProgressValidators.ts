import { z } from 'zod'

const fields = {
  kind: z.enum(['progress', 'result', 'decision', 'blocker']).optional(),
  note: z.string().trim().min(2).max(2000),
  minutes: z.number().int().min(1).max(1440).nullable().optional(),
  nextStep: z.string().trim().max(500).nullable().optional()
}

export const createReviewProgressSchema = z.object({
  taskId: z.string().min(1),
  subtaskId: z.string().nullable().optional(),
  workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ...fields
})

export const updateReviewProgressSchema = z
  .object(fields)
  .partial()
  .refine((value) => Object.keys(value).length > 0)
