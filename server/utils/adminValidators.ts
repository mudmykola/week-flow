import { z } from 'zod'

export const adminAccountPatchSchema = z
  .object({
    role: z.enum(['user', 'pm', 'admin']).optional(),
    disabled: z.boolean().optional(),
    reason: z.string().trim().max(240).optional()
  })
  .refine((value) => value.role !== undefined || value.disabled !== undefined)

export const adminBulkAccountSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  patch: z
    .object({ role: z.enum(['user', 'pm', 'admin']).optional(), disabled: z.boolean().optional() })
    .refine((value) => value.role !== undefined || value.disabled !== undefined),
  reason: z.string().trim().max(240).optional()
})

export const adminTeamPatchSchema = z.object({ managerId: z.string().uuid() })
