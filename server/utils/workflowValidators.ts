import { z } from 'zod'

export const automationRuleSchema = z.object({
  name: z.string().trim().min(1).max(80),
  trigger: z.enum(['task_created', 'status_changed']),
  triggerValue: z.string().max(40).nullable().optional(),
  action: z.enum(['set_priority', 'assign_user', 'add_tag']),
  actionValue: z.string().trim().min(1).max(80),
  enabled: z.boolean().optional().default(true)
})

export const automationRulePatchSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    trigger: z.enum(['task_created', 'status_changed']).optional(),
    triggerValue: z.string().max(40).nullable().optional(),
    action: z.enum(['set_priority', 'assign_user', 'add_tag']).optional(),
    actionValue: z.string().trim().min(1).max(80).optional(),
    enabled: z.boolean().optional()
  })
  .refine((value) => Object.keys(value).length > 0)
